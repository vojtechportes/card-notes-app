import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'
import type { SyncAccountState } from './types/sync-account-state'
import type { SyncErrorClassificationEnum } from './types/sync-error-classification-enum'

interface SyncAccountStateRow {
  workspace_id: string
  is_enabled: number
  active_provider: SyncAccountState['activeProvider']
  connection_state: string
  provider_account_id: string | null
  provider_account_display_name: string | null
  provider_workspace_id: string | null
  provider_workspace_display_name: string | null
  last_attempted_at: string | null
  last_succeeded_at: string | null
  last_error_classification: string | null
}

@Injectable()
export class SyncOrchestrationRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  getAccountState(): SyncAccountState {
    const row = this.getDatabase()
      .prepare('SELECT * FROM sync_account_state WHERE id = 1')
      .get() as SyncAccountStateRow

    return {
      workspaceId: row.workspace_id,
      isEnabled: Boolean(row.is_enabled),
      activeProvider: row.active_provider,
      connectionState: row.connection_state,
      providerAccountId: row.provider_account_id,
      providerAccountDisplayName: row.provider_account_display_name,
      providerWorkspaceId: row.provider_workspace_id,
      providerWorkspaceDisplayName: row.provider_workspace_display_name,
      lastAttemptedAt: row.last_attempted_at,
      lastSucceededAt: row.last_succeeded_at,
      lastErrorClassification: row.last_error_classification,
    }
  }

  countPendingMutations(): number {
    const row = this.getDatabase()
      .prepare(
        "SELECT COUNT(*) AS count FROM sync_outbox WHERE status IN ('pending', 'claimed')"
      )
      .get() as { count: number }

    return row.count
  }

  getPendingMutationSignature(): string {
    const row = this.getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count, MAX(updated_at) AS latestUpdatedAt
        FROM sync_outbox WHERE status IN ('pending', 'claimed')`
      )
      .get() as { count: number; latestUpdatedAt: string | null }

    return `${row.count}:${row.latestUpdatedAt ?? ''}`
  }

  countUnresolvedConflicts(): number {
    const row = this.getDatabase()
      .prepare(
        "SELECT COUNT(*) AS count FROM sync_conflicts WHERE resolution_state = 'unresolved'"
      )
      .get() as { count: number }

    return row.count
  }

  recordAttempt(at: string): void {
    this.getDatabase()
      .prepare(
        `UPDATE sync_account_state SET last_attempted_at = ?,
          connection_state = 'connected', updated_at = ? WHERE id = 1`
      )
      .run(at, at)
  }

  recordSuccess(at: string): void {
    this.getDatabase()
      .prepare(
        `UPDATE sync_account_state SET last_succeeded_at = ?,
          last_error_classification = NULL, connection_state = 'connected',
          updated_at = ? WHERE id = 1`
      )
      .run(at, at)
  }

  recordFailure(
    classification: SyncErrorClassificationEnum,
    requiresAttention: boolean,
    at: string
  ): void {
    const connectionState = requiresAttention
      ? 'attention-required'
      : 'connected'

    this.getDatabase()
      .prepare(
        `UPDATE sync_account_state SET last_error_classification = ?,
          connection_state = ?, updated_at = ? WHERE id = 1`
      )
      .run(classification, connectionState, at)
  }

  invalidateActiveCursor(reason: string): boolean {
    const account = this.getAccountState()
    if (!account.activeProvider) {
      return false
    }

    const result = this.getDatabase()
      .prepare(
        `UPDATE sync_provider_cursors SET is_invalidated = 1,
          invalidation_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ? AND provider = ?`
      )
      .run(reason, account.workspaceId, account.activeProvider)

    return result.changes > 0
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
