import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import type { ReconciledSyncDocumentState } from './types/reconciled-sync-document-state'
import type { SaveReconciledSyncDocumentInput } from './types/save-reconciled-sync-document-input'
import { getSyncDocumentIdentity } from './utils/get-sync-document-identity.util'

interface ReconciledSyncDocumentRow {
  workspace_id: string
  provider: ReconciledSyncDocumentState['provider']
  logical_key: string
  entity_kind: ReconciledSyncDocumentState['entityKind']
  entity_id: string
  provider_object_id: string
  provider_version: string
  content_hash: string
  merge_base_json: string
}

@Injectable()
export class SyncRemoteDocumentRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  saveReconciledDocument(
    input: SaveReconciledSyncDocumentInput
  ): ReconciledSyncDocumentState {
    const { mappedDocument } = input
    const { document } = mappedDocument
    const identity = getSyncDocumentIdentity(document)
    const now = new Date().toISOString()

    this.getDatabase()
      .prepare(
        `
        INSERT INTO sync_remote_objects (
          id, workspace_id, provider, logical_key, entity_kind, entity_id,
          provider_object_id, provider_version, content_hash, merge_base_json,
          created_at, updated_at
        ) VALUES (
          @id, @workspaceId, @provider, @logicalKey, @entityKind, @entityId,
          @providerObjectId, @providerVersion, @contentHash, @mergeBaseJson,
          @now, @now
        )
        ON CONFLICT(provider, workspace_id, logical_key) DO UPDATE SET
          entity_kind = excluded.entity_kind,
          entity_id = excluded.entity_id,
          provider_object_id = excluded.provider_object_id,
          provider_version = excluded.provider_version,
          content_hash = excluded.content_hash,
          merge_base_json = excluded.merge_base_json,
          updated_at = excluded.updated_at
      `
      )
      .run({
        id: uuidV4(),
        workspaceId: document.workspaceId,
        provider: input.provider,
        logicalKey: mappedDocument.logicalKey,
        entityKind: identity.entityKind,
        entityId: identity.entityId,
        providerObjectId: input.providerObjectId,
        providerVersion: input.providerVersion,
        contentHash: mappedDocument.contentHash,
        mergeBaseJson: mappedDocument.canonicalJson,
        now,
      })

    return this.findReconciledDocument(
      input.provider,
      document.workspaceId,
      mappedDocument.logicalKey
    )!
  }

  findReconciledDocument(
    provider: ReconciledSyncDocumentState['provider'],
    workspaceId: string,
    logicalKey: string
  ): ReconciledSyncDocumentState | null {
    const row = this.getDatabase()
      .prepare(
        `
        SELECT
          workspace_id, provider, logical_key, entity_kind, entity_id,
          provider_object_id, provider_version, content_hash, merge_base_json
        FROM sync_remote_objects
        WHERE provider = ? AND workspace_id = ? AND logical_key = ?
      `
      )
      .get(provider, workspaceId, logicalKey) as
      ReconciledSyncDocumentRow | undefined

    if (!row) {
      return null
    }

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
