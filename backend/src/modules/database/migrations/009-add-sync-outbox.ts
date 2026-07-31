import type { DatabaseMigration } from '../database-migration'

export const addSyncOutboxMigration: DatabaseMigration = {
  id: '009-add-sync-outbox',
  up: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_outbox (
        mutation_id TEXT PRIMARY KEY,
        latest_mutation_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        entity_kind TEXT NOT NULL CHECK (
          entity_kind IN ('workspace', 'configuration', 'note', 'asset')
        ),
        entity_id TEXT NOT NULL,
        logical_key TEXT NOT NULL,
        intent TEXT NOT NULL CHECK (intent IN ('upsert', 'tombstone')),
        base_hash TEXT NULL CHECK (base_hash IS NULL OR length(base_hash) = 64),
        target_hash TEXT NOT NULL CHECK (length(target_hash) = 64),
        originating_device_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (
          status IN ('pending', 'claimed', 'completed', 'superseded')
        ),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        next_attempt_at TEXT NULL,
        last_failure_classification TEXT NULL,
        claim_token TEXT NULL,
        claimed_by TEXT NULL,
        claim_expires_at TEXT NULL,
        coalesced_count INTEGER NOT NULL DEFAULT 0 CHECK (coalesced_count >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT NULL,
        FOREIGN KEY (workspace_id) REFERENCES sync_identity(workspace_id) ON DELETE CASCADE,
        CHECK (
          (status = 'claimed' AND claim_token IS NOT NULL AND claimed_by IS NOT NULL AND claim_expires_at IS NOT NULL) OR
          (status <> 'claimed' AND claim_token IS NULL AND claimed_by IS NULL AND claim_expires_at IS NULL)
        )
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_outbox_pending_target
        ON sync_outbox(workspace_id, logical_key)
        WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_claimable
        ON sync_outbox(status, next_attempt_at, claim_expires_at, created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_target
        ON sync_outbox(workspace_id, entity_kind, entity_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_latest_mutation
        ON sync_outbox(latest_mutation_id);
    `)
  },
}
