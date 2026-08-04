import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import type { CreateSyncPairingOperationInput } from './types/create-sync-pairing-operation-input'
import { SyncEntityKindEnum } from './types/sync-entity-kind-enum'
import type { SyncPairingDecisionEnum } from './types/sync-pairing-decision-enum'
import type { SyncPairingModeEnum } from './types/sync-pairing-mode-enum'
import type { SyncPairingOperation } from './types/sync-pairing-operation'
import type { SyncPairingOperationRow } from './types/sync-pairing-operation-row'
import type { SyncPairingOperationTypeEnum } from './types/sync-pairing-operation-type-enum'
import { SyncPairingStatusEnum } from './types/sync-pairing-status-enum'
import type { SyncProviderEnum } from './types/sync-provider-enum'
import { createSyncTargetHash } from './utils/create-sync-target-hash.util'
import { getSyncLogicalKey } from './utils/get-sync-logical-key.util'

@Injectable()
export class SyncPairingRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  getWorkspaceIdentity(): { workspaceId: string; deviceId: string } {
    return this.getDatabase()
      .prepare(
        'SELECT workspace_id AS workspaceId, device_id AS deviceId FROM sync_identity WHERE id = 1'
      )
      .get() as { workspaceId: string; deviceId: string }
  }

  isLocalPopulated(): boolean {
    const database = this.getDatabase()
    const counts = database
      .prepare(
        `SELECT
        (SELECT COUNT(*) FROM notes) AS notes,
        (SELECT COUNT(*) FROM labels) AS labels,
        (SELECT COUNT(*) FROM note_types) AS noteTypes,
        (SELECT COUNT(*) FROM note_columns) AS columns,
        (SELECT COUNT(*) FROM note_columns WHERE is_default = 0) AS customColumns,
        (SELECT COUNT(*) FROM app_settings) AS settings`
      )
      .get() as Record<string, number>

    return (
      counts.notes > 0 ||
      counts.labels > 0 ||
      counts.noteTypes > 1 ||
      counts.columns > 2 ||
      counts.customColumns > 0 ||
      counts.settings > 0
    )
  }

  create(input: CreateSyncPairingOperationInput): SyncPairingOperation {
    const id = uuidV4()
    const now = new Date().toISOString()

    this.getDatabase()
      .prepare(
        `INSERT INTO sync_pairing_operations (
        id, operation_type, target_provider, account_id, account_display_name,
        local_workspace_id, remote_workspace_id, remote_workspace_display_name,
        mode, status, local_is_populated, remote_is_populated,
        pending_mutation_count, retain_pending_work, previous_provider,
        previous_account_id, created_at, updated_at
      ) VALUES (
        @id, @operationType, @targetProvider, @accountId, @accountDisplayName,
        @localWorkspaceId, @remoteWorkspaceId, @remoteWorkspaceDisplayName,
        @mode, 'prepared', @localIsPopulated, @remoteIsPopulated,
        @pendingMutationCount, @retainPendingWork, @previousProvider,
        @previousAccountId, @now, @now
      )`
      )
      .run({
        ...input,
        id,
        now,
        localIsPopulated: input.localIsPopulated ? 1 : 0,
        remoteIsPopulated: input.remoteIsPopulated ? 1 : 0,
        retainPendingWork: input.retainPendingWork ? 1 : 0,
      })

    return this.findById(id)!
  }

  findActive(): SyncPairingOperation | null {
    const row = this.getDatabase()
      .prepare(
        `SELECT * FROM sync_pairing_operations
        WHERE status IN ('prepared', 'applying')
        ORDER BY created_at DESC LIMIT 1`
      )
      .get() as SyncPairingOperationRow | undefined

    return row ? this.mapRow(row) : null
  }

  findById(id: string): SyncPairingOperation | null {
    const row = this.getDatabase()
      .prepare('SELECT * FROM sync_pairing_operations WHERE id = ?')
      .get(id) as SyncPairingOperationRow | undefined

    return row ? this.mapRow(row) : null
  }

  setApplying(
    id: string,
    decision: SyncPairingDecisionEnum,
    backupPath: string | null
  ): SyncPairingOperation {
    this.getDatabase()
      .prepare(
        `UPDATE sync_pairing_operations SET status = 'applying',
        decision = ?, backup_path = ?, error_code = NULL,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'prepared'`
      )
      .run(decision, backupPath, id)

    return this.requireById(id)
  }

  complete(id: string): SyncPairingOperation {
    this.getDatabase()
      .prepare(
        `UPDATE sync_pairing_operations SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'applying'`
      )
      .run(id)

    return this.requireById(id)
  }

  fail(id: string, errorCode: string): SyncPairingOperation {
    this.getDatabase()
      .prepare(
        `UPDATE sync_pairing_operations SET status = 'failed',
        error_code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'applying'`
      )
      .run(errorCode, id)

    return this.requireById(id)
  }

  cancel(id: string): SyncPairingOperation {
    this.getDatabase()
      .prepare(
        `UPDATE sync_pairing_operations SET status = 'cancelled',
        completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'prepared'`
      )
      .run(id)

    return this.requireById(id)
  }

  bind(
    provider: SyncProviderEnum,
    accountId: string,
    accountDisplayName: string | null,
    workspaceId: string,
    workspaceDisplayName: string | null
  ): void {
    this.getDatabase()
      .prepare(
        `UPDATE sync_account_state SET is_enabled = 1,
        active_provider = ?, connection_state = 'connected',
        provider_account_id = ?, provider_account_display_name = ?,
        provider_workspace_id = ?, provider_workspace_display_name = ?,
        last_error_classification = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1`
      )
      .run(
        provider,
        accountId,
        accountDisplayName,
        workspaceId,
        workspaceDisplayName
      )
  }

  setEnabled(isEnabled: boolean): void {
    this.getDatabase()
      .prepare(
        `UPDATE sync_account_state SET is_enabled = ?,
        connection_state = ?, last_error_classification = NULL,
        updated_at = CURRENT_TIMESTAMP WHERE id = 1`
      )
      .run(isEnabled ? 1 : 0, isEnabled ? 'connected' : 'disconnected')
  }
  disconnect(): void {
    this.getDatabase()
      .prepare(
        `UPDATE sync_account_state SET is_enabled = 0,
        active_provider = NULL, connection_state = 'disabled',
        provider_account_id = NULL, provider_account_display_name = NULL,
        provider_workspace_id = NULL, provider_workspace_display_name = NULL,
        last_error_classification = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1`
      )
      .run()
  }

  resetSynchronizationState(): void {
    const database = this.getDatabase()
    const reset = database.transaction(() => {
      this.disconnect()
      database.exec(`
        DELETE FROM sync_remote_objects;
        DELETE FROM sync_provider_cursors;
        DELETE FROM sync_conflicts;
        DELETE FROM sync_outbox;
      `)
    })

    reset()
  }

  adoptWorkspace(workspaceId: string): void {
    const database = this.getDatabase()
    const current = this.getWorkspaceIdentity().workspaceId
    if (current === workspaceId) {
      return
    }

    const adopt = database.transaction(() => {
      database.pragma('defer_foreign_keys = ON')
      for (const table of [
        'sync_remote_objects',
        'sync_provider_cursors',
        'sync_conflicts',
      ]) {
        database
          .prepare(`DELETE FROM ${table} WHERE workspace_id = ?`)
          .run(current)
      }
      for (const table of ['sync_account_state', 'sync_outbox']) {
        database
          .prepare(
            `UPDATE ${table} SET workspace_id = ? WHERE workspace_id = ?`
          )
          .run(workspaceId, current)
      }
      database
        .prepare(
          'UPDATE sync_identity SET workspace_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
        )
        .run(workspaceId)
    })

    adopt()
  }

  clearLocalSynchronizedData(): void {
    const database = this.getDatabase()
    const clear = database.transaction(() => {
      database.exec(`
        DELETE FROM note_values;
        DELETE FROM notes;
        DELETE FROM labels;
        DELETE FROM note_columns;
        DELETE FROM note_types;
        DELETE FROM app_settings;
        DELETE FROM assets;
        DELETE FROM sync_remote_objects;
        DELETE FROM sync_provider_cursors;
        DELETE FROM sync_conflicts;
        DELETE FROM sync_outbox;
      `)
    })

    clear()
  }

  createResolvedBaseline(
    provider: SyncProviderEnum,
    workspaceId: string,
    retainPendingWork: boolean
  ): void {
    const database = this.getDatabase()
    const identity = this.getWorkspaceIdentity()
    const baseline = database.transaction(() => {
      if (!retainPendingWork) {
        database
          .prepare(
            `UPDATE sync_outbox SET status = 'superseded',
            claim_token = NULL, claimed_by = NULL, claim_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
            WHERE status IN ('pending', 'claimed')`
          )
          .run()
      }

      const enqueue = (
        entityKind: SyncEntityKindEnum,
        entityId: string,
        intent: 'upsert' | 'tombstone',
        mutationId: string,
        modifiedAt: string
      ): void => {
        const logicalKey = getSyncLogicalKey(database, entityKind, entityId)
        const targetHash = createSyncTargetHash(database, entityKind, entityId)
        const remote = database
          .prepare(
            `SELECT content_hash AS contentHash FROM sync_remote_objects
            WHERE workspace_id = ? AND provider = ? AND logical_key = ?`
          )
          .get(workspaceId, provider, logicalKey) as
          { contentHash: string | null } | undefined

        database
          .prepare(
            `INSERT OR IGNORE INTO sync_outbox (
            mutation_id, latest_mutation_id, workspace_id, entity_kind,
            entity_id, logical_key, intent, base_hash, target_hash,
            originating_device_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            uuidV4(),
            mutationId,
            workspaceId,
            entityKind,
            entityId,
            logicalKey,
            intent,
            remote?.contentHash ?? null,
            targetHash,
            identity.deviceId,
            modifiedAt,
            modifiedAt
          )
      }

      const configuration = database
        .prepare(
          `SELECT mutationId, modifiedAt FROM (
            SELECT mutation_id AS mutationId, modified_at AS modifiedAt FROM note_types
            UNION ALL
            SELECT mutation_id AS mutationId, modified_at AS modifiedAt FROM note_columns
            UNION ALL
            SELECT mutation_id AS mutationId, modified_at AS modifiedAt FROM labels
            UNION ALL
            SELECT mutation_id AS mutationId, modified_at AS modifiedAt FROM app_settings
          ) WHERE mutationId IS NOT NULL AND modifiedAt IS NOT NULL
          ORDER BY modifiedAt DESC, mutationId DESC LIMIT 1`
        )
        .get() as { mutationId: string; modifiedAt: string } | undefined
      if (configuration) {
        enqueue(
          SyncEntityKindEnum.Configuration,
          'configuration',
          'upsert',
          configuration.mutationId,
          configuration.modifiedAt
        )
      }

      const notes = database
        .prepare(
          `SELECT id, mutation_id AS mutationId,
          deletion_mutation_id AS deletionMutationId,
          modified_at AS modifiedAt, deleted_at AS deletedAt FROM notes`
        )
        .all() as Array<{
        id: string
        mutationId: string
        deletionMutationId: string | null
        modifiedAt: string
        deletedAt: string | null
      }>
      for (const note of notes) {
        enqueue(
          SyncEntityKindEnum.Note,
          note.id,
          note.deletedAt ? 'tombstone' : 'upsert',
          note.deletionMutationId ?? note.mutationId,
          note.modifiedAt
        )
      }

      const assets = database
        .prepare(
          `SELECT asset_id AS assetId, updated_at AS modifiedAt
          FROM assets WHERE integrity_state = 'available'`
        )
        .all() as Array<{ assetId: string; modifiedAt: string }>
      for (const asset of assets) {
        enqueue(
          SyncEntityKindEnum.Asset,
          asset.assetId,
          'upsert',
          uuidV4(),
          asset.modifiedAt
        )
      }
    })

    baseline()
  }

  private requireById(id: string): SyncPairingOperation {
    const operation = this.findById(id)
    if (!operation) {
      throw new Error(`Synchronization pairing operation ${id} was not found.`)
    }
    return operation
  }

  private mapRow(row: SyncPairingOperationRow): SyncPairingOperation {
    return {
      id: row.id,
      operationType: row.operation_type,
      targetProvider: row.target_provider,
      accountId: row.account_id,
      accountDisplayName: row.account_display_name,
      localWorkspaceId: row.local_workspace_id,
      remoteWorkspaceId: row.remote_workspace_id,
      remoteWorkspaceDisplayName: row.remote_workspace_display_name,
      mode: row.mode,
      status: row.status,
      localIsPopulated: Boolean(row.local_is_populated),
      remoteIsPopulated: Boolean(row.remote_is_populated),
      pendingMutationCount: row.pending_mutation_count,
      retainPendingWork: Boolean(row.retain_pending_work),
      previousProvider: row.previous_provider,
      previousAccountId: row.previous_account_id,
      backupPath: row.backup_path,
      decision: row.decision,
      errorCode: row.error_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
