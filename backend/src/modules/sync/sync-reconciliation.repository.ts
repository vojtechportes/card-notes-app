import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'
import type { ActiveSyncContext } from './types/active-sync-context'
import type { ClaimedSyncDocument } from './types/claimed-sync-document'
import type { MappedSyncDocument } from './types/mapped-sync-document'
import type { PulledSyncAsset } from './types/pulled-sync-asset'
import type { PulledSyncDocument } from './types/pulled-sync-document'
import type { ReconciledSyncDocumentState } from './types/reconciled-sync-document-state'
import { SyncEntityKindEnum } from './types/sync-entity-kind-enum'
import type { SyncOutboxEntry } from './types/sync-outbox-entry'
import { SyncOutboxStatusEnum } from './types/sync-outbox-status-enum'
import type { SyncProviderCursorState } from './types/sync-provider-cursor-state'
import type { SyncPullTransactionHooks } from './types/sync-pull-transaction-hooks'
import type { SyncRemoteDocument } from './types/sync-remote-document'
import { applyRemoteConfigurationDocument } from './utils/apply-remote-configuration-document.util'
import { applyRemoteNoteDocument } from './utils/apply-remote-note-document.util'
import { createLocalConfigurationSyncDocument } from './utils/create-local-configuration-sync-document.util'
import { createLocalNoteSyncDocument } from './utils/create-local-note-sync-document.util'
import { saveSyncProviderCursor } from './utils/save-sync-provider-cursor.util'

interface RemoteObjectRow {
  workspace_id: string
  provider: ReconciledSyncDocumentState['provider']
  logical_key: string
  entity_kind: ReconciledSyncDocumentState['entityKind']
  entity_id: string
  provider_object_id: string
  provider_version: string
  content_hash: string
  merge_base_json: string | null
}

@Injectable()
export class SyncReconciliationRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  getActiveContext(): ActiveSyncContext | null {
    const row = this.getDatabase()
      .prepare(
        `
      SELECT i.workspace_id AS workspaceId, i.device_id AS deviceId,
        a.active_provider AS provider
      FROM sync_identity i INNER JOIN sync_account_state a ON a.id = 1
      WHERE i.id = 1 AND a.is_enabled = 1 AND a.active_provider IS NOT NULL
        AND a.provider_workspace_id IS NOT NULL
    `
      )
      .get() as ActiveSyncContext | undefined
    return row ?? null
  }

  getCursor(context: ActiveSyncContext): SyncProviderCursorState | null {
    const row = this.getDatabase()
      .prepare(
        `
      SELECT workspace_id AS workspaceId, provider, cursor,
        cursor_generation AS cursorGeneration,
        is_invalidated AS isInvalidated, invalidation_reason AS invalidationReason
      FROM sync_provider_cursors WHERE workspace_id = ? AND provider = ?
    `
      )
      .get(context.workspaceId, context.provider) as
      | (Omit<SyncProviderCursorState, 'isInvalidated'> & {
          isInvalidated: number
        })
      | undefined
    return row ? { ...row, isInvalidated: Boolean(row.isInvalidated) } : null
  }

  invalidateCursor(context: ActiveSyncContext, reason: string): void {
    this.getDatabase()
      .prepare(
        `
      UPDATE sync_provider_cursors SET is_invalidated = 1,
        invalidation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ? AND provider = ?
    `
      )
      .run(reason, context.workspaceId, context.provider)
  }

  findRemoteState(
    context: ActiveSyncContext,
    logicalKey: string
  ): ReconciledSyncDocumentState | null {
    const row = this.getDatabase()
      .prepare(
        `
      SELECT workspace_id, provider, logical_key, entity_kind, entity_id,
        provider_object_id, provider_version, content_hash, merge_base_json
      FROM sync_remote_objects
      WHERE workspace_id = ? AND provider = ? AND logical_key = ?
    `
      )
      .get(context.workspaceId, context.provider, logicalKey) as
      RemoteObjectRow | undefined
    return row ? this.mapRemoteRow(row) : null
  }

  listRemoteStates(context: ActiveSyncContext): ReconciledSyncDocumentState[] {
    const rows = this.getDatabase()
      .prepare(
        `SELECT workspace_id, provider, logical_key, entity_kind, entity_id,
          provider_object_id, provider_version, content_hash, merge_base_json
        FROM sync_remote_objects WHERE workspace_id = ? AND provider = ?`
      )
      .all(context.workspaceId, context.provider) as RemoteObjectRow[]
    return rows.map((row) => this.mapRemoteRow(row))
  }
  createLocalDocument(
    context: ActiveSyncContext,
    entityKind: SyncEntityKindEnum,
    entityId: string,
    parentHash: string | null
  ): MappedSyncDocument<SyncRemoteDocument> | null {
    if (entityKind === SyncEntityKindEnum.Note) {
      return createLocalNoteSyncDocument(
        this.getDatabase(),
        context.workspaceId,
        entityId,
        parentHash
      )
    }
    if (entityKind === SyncEntityKindEnum.Configuration) {
      return createLocalConfigurationSyncDocument(
        this.getDatabase(),
        context.workspaceId,
        parentHash
      )
    }
    return null
  }

  applyPull(
    context: ActiveSyncContext,
    documents: PulledSyncDocument[],
    assets: PulledSyncAsset[],
    candidateCursor: string,
    wasFullEnumeration: boolean,
    hooks: SyncPullTransactionHooks = {}
  ): void {
    const apply = this.getDatabase().transaction(() => {
      for (const pulled of documents) {
        if (pulled.applyToDomain) {
          const document = pulled.mappedDocument.document
          if ('entityType' in document && document.entityType === 'note') {
            applyRemoteNoteDocument(this.getDatabase(), document)
          } else if (
            'entityType' in document &&
            document.entityType === 'configuration'
          ) {
            applyRemoteConfigurationDocument(this.getDatabase(), document)
          }
        }
        this.saveRemoteState(context, pulled)
        if (pulled.acknowledgeOutbox) {
          const document = pulled.mappedDocument.document
          const mutationId =
            'mutationId' in document ? document.mutationId : null
          if (mutationId) {
            this.getDatabase()
              .prepare(
                `UPDATE sync_outbox SET status = 'completed',
                  claim_token = NULL, claimed_by = NULL, claim_expires_at = NULL,
                  completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE workspace_id = ? AND logical_key = ?
                  AND latest_mutation_id = ?
                  AND status IN ('pending', 'claimed')`
              )
              .run(context.workspaceId, pulled.metadata.logicalKey, mutationId)
          }
        }
      }
      for (const asset of assets) {
        this.saveAssetRemoteState(context, asset)
      }
      hooks.afterLocalApply?.()
      hooks.beforeCursorCommit?.()
      saveSyncProviderCursor(
        this.getDatabase(),
        context.workspaceId,
        context.provider,
        candidateCursor,
        wasFullEnumeration
      )
    })
    apply()
  }

  listClaimedDocuments(entries: SyncOutboxEntry[]): ClaimedSyncDocument[] {
    const context = this.getActiveContext()
    if (!context) {
      return []
    }
    return entries.flatMap((entry) => {
      const remote = this.findRemoteState(context, entry.logicalKey)
      const mappedDocument = this.createLocalDocument(
        context,
        entry.entityKind,
        entry.entityId,
        remote?.contentHash ?? entry.baseHash
      )
      return mappedDocument ? [{ entry, mappedDocument }] : []
    })
  }

  private saveRemoteState(
    context: ActiveSyncContext,
    pulled: PulledSyncDocument
  ): void {
    const document = pulled.mappedDocument.document
    const entityId =
      'entityId' in document ? document.entityId : document.workspaceId
    this.getDatabase()
      .prepare(
        `
      INSERT INTO sync_remote_objects (
        id, workspace_id, provider, logical_key, entity_kind, entity_id,
        provider_object_id, provider_version, content_hash, merge_base_json
      ) VALUES (
        lower(hex(randomblob(16))), @workspaceId, @provider, @logicalKey,
        @entityKind, @entityId, @providerObjectId, @providerVersion,
        @contentHash, @mergeBaseJson
      ) ON CONFLICT(provider, workspace_id, logical_key) DO UPDATE SET
        entity_kind = excluded.entity_kind, entity_id = excluded.entity_id,
        provider_object_id = excluded.provider_object_id,
        provider_version = excluded.provider_version,
        content_hash = excluded.content_hash,
        merge_base_json = excluded.merge_base_json,
        updated_at = CURRENT_TIMESTAMP
    `
      )
      .run({
        workspaceId: context.workspaceId,
        provider: context.provider,
        logicalKey: pulled.mappedDocument.logicalKey,
        entityKind: pulled.metadata.entityKind,
        entityId,
        providerObjectId: pulled.metadata.providerObjectId,
        providerVersion: pulled.metadata.providerVersion,
        contentHash: pulled.mappedDocument.contentHash,
        mergeBaseJson: pulled.mappedDocument.canonicalJson,
      })
  }

  private saveAssetRemoteState(
    context: ActiveSyncContext,
    asset: PulledSyncAsset
  ): void {
    this.getDatabase()
      .prepare(
        `INSERT INTO sync_remote_objects (
          id, workspace_id, provider, logical_key, entity_kind, entity_id,
          provider_object_id, provider_version, content_hash, merge_base_json
        ) VALUES (
          lower(hex(randomblob(16))), @workspaceId, @provider, @logicalKey,
          'asset', @assetId, @providerObjectId, @providerVersion,
          @contentHash, NULL
        ) ON CONFLICT(provider, workspace_id, logical_key) DO UPDATE SET
          provider_object_id = excluded.provider_object_id,
          provider_version = excluded.provider_version,
          content_hash = excluded.content_hash,
          updated_at = CURRENT_TIMESTAMP`
      )
      .run({
        workspaceId: context.workspaceId,
        provider: context.provider,
        logicalKey: asset.metadata.logicalKey,
        assetId: asset.assetId,
        providerObjectId: asset.metadata.providerObjectId,
        providerVersion: asset.metadata.providerVersion,
        contentHash: asset.assetId,
      })
  }
  private mapRemoteRow(row: RemoteObjectRow): ReconciledSyncDocumentState {
    return {
      workspaceId: row.workspace_id,
      provider: row.provider,
      logicalKey: row.logical_key,
      entityKind: row.entity_kind,
      entityId: row.entity_id,
      providerObjectId: row.provider_object_id,
      providerVersion: row.provider_version,
      contentHash: row.content_hash,
      mergeBaseJson: row.merge_base_json,
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
