import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import { SyncConflictRepository } from './sync-conflict.repository'
import type { ResolveSyncConflictInput } from './types/resolve-sync-conflict-input'
import type { SyncConflictRecord } from './types/sync-conflict-record'
import { SyncConflictResolutionStateEnum } from './types/sync-conflict-resolution-state-enum'
import { SyncEntityKindEnum } from './types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from './types/sync-mutation-intent-enum'
import type { SyncRemoteDocument } from './types/sync-remote-document'
import { applyRemoteConfigurationDocument } from './utils/apply-remote-configuration-document.util'
import { applyRemoteNoteDocument } from './utils/apply-remote-note-document.util'
import { enqueueSyncOutboxMutation } from './utils/enqueue-sync-outbox-mutation.util'
import { hasValidSyncConfigurationRelationships } from './utils/has-valid-sync-configuration-relationships.util'
import { rebaseSyncDocumentForLocalMutation } from './utils/rebase-sync-document-for-local-mutation.util'

interface ConflictResolutionContext {
  workspaceId: string
  deviceId: string
  provider: string
}

@Injectable()
export class SyncConflictService {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
    @Inject(SyncConflictRepository)
    private readonly conflictRepository: SyncConflictRepository
  ) {}

  listUnresolved(): SyncConflictRecord[] {
    return this.conflictRepository.listUnresolved(this.getWorkspaceId())
  }

  findById(conflictId: string): SyncConflictRecord | null {
    return this.conflictRepository.findById(conflictId)
  }

  resolve(input: ResolveSyncConflictInput): SyncConflictRecord {
    if (
      input.retainBoth &&
      input.resolutionState !== SyncConflictResolutionStateEnum.ResolvedMerged
    ) {
      throw new Error(
        'Retaining both versions requires merged conflict resolution.'
      )
    }

    const database = this.getDatabase()
    const transaction = database.transaction(() => {
      const conflict = this.conflictRepository.findById(input.conflictId)
      if (!conflict) {
        throw new Error(
          `Synchronization conflict ${input.conflictId} was not found.`
        )
      }
      if (
        conflict.resolutionState !== SyncConflictResolutionStateEnum.Unresolved
      ) {
        return conflict
      }

      if (input.retainBoth) {
        this.assertRetainedConflictCopyExists(database, conflict)
      } else {
        const selectedDocument = this.selectResolutionDocument(conflict, input)
        this.applyResolutionDocument(database, conflict, selectedDocument)
      }

      return this.conflictRepository.markResolved(
        conflict.id,
        input.resolutionState
      )!
    })

    return transaction()
  }

  private assertRetainedConflictCopyExists(
    database: Database,
    conflict: SyncConflictRecord
  ): void {
    if (!conflict.conflictCopyEntityId) {
      throw new Error(
        `Synchronization conflict ${conflict.id} has no preserved copy to retain.`
      )
    }

    const copy = database
      .prepare('SELECT 1 FROM notes WHERE id = ?')
      .get(conflict.conflictCopyEntityId)
    if (!copy) {
      throw new Error(
        `The preserved copy for synchronization conflict ${conflict.id} is unavailable.`
      )
    }
  }

  private selectResolutionDocument(
    conflict: SyncConflictRecord,
    input: ResolveSyncConflictInput
  ): SyncRemoteDocument {
    let document: SyncRemoteDocument | null = null

    if (
      input.resolutionState === SyncConflictResolutionStateEnum.ResolvedLocal
    ) {
      document = this.parseStoredDocument(conflict.localDocumentJson)
    } else if (
      input.resolutionState === SyncConflictResolutionStateEnum.ResolvedRemote
    ) {
      document = this.parseStoredDocument(conflict.remoteDocumentJson)
    } else {
      document = input.mergedDocument ?? null
    }

    if (!document) {
      throw new Error(
        `Synchronization conflict ${conflict.id} has no document for the selected resolution.`
      )
    }

    return document
  }
  private applyResolutionDocument(
    database: Database,
    conflict: SyncConflictRecord,
    selectedDocument: SyncRemoteDocument
  ): void {
    const context = this.getContext()
    if (selectedDocument.workspaceId !== context.workspaceId) {
      throw new Error(
        'Conflict resolution document belongs to another workspace.'
      )
    }

    const remote = database
      .prepare(
        `SELECT content_hash FROM sync_remote_objects
        WHERE workspace_id = ? AND provider = ? AND entity_kind = ?
          AND entity_id IS ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(
        context.workspaceId,
        context.provider,
        conflict.entityKind,
        conflict.entityId
      ) as { content_hash: string | null } | undefined
    const mutationId = uuidV4()
    const modifiedAt = new Date().toISOString()
    const document = rebaseSyncDocumentForLocalMutation(
      selectedDocument,
      remote?.content_hash ?? null,
      mutationId,
      context.deviceId,
      modifiedAt
    )

    if (!('entityType' in document)) {
      throw new Error('Workspace documents cannot resolve entity conflicts.')
    }

    let intent = SyncMutationIntentEnum.Upsert
    if (document.entityType === 'note') {
      applyRemoteNoteDocument(database, document)
      if (document.deletedAt) {
        intent = SyncMutationIntentEnum.Tombstone
      }
    } else {
      if (!hasValidSyncConfigurationRelationships(document)) {
        throw new Error('Conflict resolution would create invalid references.')
      }
      applyRemoteConfigurationDocument(database, document)
    }

    const entityKind =
      document.entityType === 'note'
        ? SyncEntityKindEnum.Note
        : SyncEntityKindEnum.Configuration

    enqueueSyncOutboxMutation(database, {
      entityKind,
      entityId: document.entityId,
      intent,
      mutationId,
      modifiedAt,
    })
  }

  private parseStoredDocument(value: string | null): SyncRemoteDocument | null {
    return value ? (JSON.parse(value) as SyncRemoteDocument) : null
  }

  private getWorkspaceId(): string {
    const identity = this.getDatabase()
      .prepare(
        'SELECT workspace_id AS workspaceId FROM sync_identity WHERE id = 1'
      )
      .get() as { workspaceId: string }

    return identity.workspaceId
  }

  private getContext(): ConflictResolutionContext {
    const context = this.getDatabase()
      .prepare(
        `SELECT i.workspace_id AS workspaceId, i.device_id AS deviceId,
          a.active_provider AS provider
        FROM sync_identity i INNER JOIN sync_account_state a ON a.id = 1
        WHERE i.id = 1 AND a.active_provider IS NOT NULL`
      )
      .get() as ConflictResolutionContext | undefined
    if (!context) {
      throw new Error(
        'Synchronization conflict resolution requires a bound workspace.'
      )
    }

    return context
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
