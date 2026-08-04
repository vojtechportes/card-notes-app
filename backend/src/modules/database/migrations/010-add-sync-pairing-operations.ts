import type { DatabaseMigration } from '../database-migration'

export const addSyncPairingOperationsMigration: DatabaseMigration = {
  id: '010-add-sync-pairing-operations',
  up: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_pairing_operations (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('pair', 'switch')),
        target_provider TEXT NOT NULL CHECK (target_provider IN ('google-drive', 'one-drive')),
        account_id TEXT NOT NULL,
        account_display_name TEXT NULL,
        local_workspace_id TEXT NOT NULL,
        remote_workspace_id TEXT NULL,
        remote_workspace_display_name TEXT NULL,
        mode TEXT NOT NULL CHECK (
          mode IN ('seed', 'restore', 'reconcile', 'mismatch')
        ),
        status TEXT NOT NULL CHECK (
          status IN ('prepared', 'applying', 'completed', 'cancelled', 'failed')
        ),
        local_is_populated INTEGER NOT NULL CHECK (local_is_populated IN (0, 1)),
        remote_is_populated INTEGER NOT NULL CHECK (remote_is_populated IN (0, 1)),
        pending_mutation_count INTEGER NOT NULL DEFAULT 0 CHECK (pending_mutation_count >= 0),
        retain_pending_work INTEGER NOT NULL DEFAULT 0 CHECK (retain_pending_work IN (0, 1)),
        previous_provider TEXT NULL,
        previous_account_id TEXT NULL,
        backup_path TEXT NULL,
        decision TEXT NULL,
        error_code TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_pairing_active
        ON sync_pairing_operations(status)
        WHERE status IN ('prepared', 'applying');
    `)
  },
}
