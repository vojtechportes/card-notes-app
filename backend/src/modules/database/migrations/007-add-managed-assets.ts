import type { DatabaseMigration } from '../database-migration'

export const addManagedAssetsMigration: DatabaseMigration = {
  id: '007-add-managed-assets',
  requiresBackup: true,
  up: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        asset_id TEXT PRIMARY KEY CHECK (length(asset_id) = 64),
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL CHECK (size > 0),
        extension TEXT NOT NULL,
        relative_path TEXT NOT NULL UNIQUE,
        integrity_state TEXT NOT NULL DEFAULT 'available' CHECK (
          integrity_state IN ('available', 'missing', 'corrupt')
        ),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_assets_integrity_state
        ON assets(integrity_state);
    `)
  },
}
