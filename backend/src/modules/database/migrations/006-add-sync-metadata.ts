import { v4 as uuidV4 } from 'uuid'
import type { DatabaseMigration } from '../database-migration'

export const addSyncMetadataMigration: DatabaseMigration = {
  id: '006-add-sync-metadata',
  requiresBackup: true,
  up: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_identity (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        device_id TEXT NOT NULL UNIQUE,
        workspace_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sync_account_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        workspace_id TEXT NOT NULL UNIQUE,
        is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0, 1)),
        active_provider TEXT NULL CHECK (
          active_provider IS NULL OR active_provider IN ('google-drive', 'one-drive')
        ),
        connection_state TEXT NOT NULL DEFAULT 'disabled' CHECK (
          connection_state IN (
            'disabled',
            'disconnected',
            'connecting',
            'connected',
            'attention-required'
          )
        ),
        provider_account_id TEXT NULL,
        provider_account_display_name TEXT NULL,
        provider_workspace_id TEXT NULL,
        provider_workspace_display_name TEXT NULL,
        last_attempted_at TEXT NULL,
        last_succeeded_at TEXT NULL,
        last_error_classification TEXT NULL,
        metadata_json TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES sync_identity(workspace_id) ON DELETE CASCADE,
        CHECK (
          connection_state <> 'disabled' OR
          (is_enabled = 0 AND active_provider IS NULL)
        )
      );

      CREATE TABLE IF NOT EXISTS sync_remote_objects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        provider TEXT NOT NULL CHECK (provider IN ('google-drive', 'one-drive')),
        logical_key TEXT NOT NULL,
        entity_kind TEXT NOT NULL CHECK (
          entity_kind IN ('workspace', 'configuration', 'note', 'asset')
        ),
        entity_id TEXT NULL,
        provider_object_id TEXT NOT NULL,
        provider_version TEXT NOT NULL,
        content_hash TEXT NULL CHECK (
          content_hash IS NULL OR length(content_hash) = 64
        ),
        merge_base_json TEXT NULL,
        metadata_json TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES sync_identity(workspace_id) ON DELETE CASCADE,
        UNIQUE(provider, workspace_id, logical_key),
        UNIQUE(provider, workspace_id, provider_object_id)
      );

      CREATE TABLE IF NOT EXISTS sync_provider_cursors (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        provider TEXT NOT NULL CHECK (provider IN ('google-drive', 'one-drive')),
        cursor TEXT NULL,
        cursor_generation INTEGER NOT NULL DEFAULT 0 CHECK (cursor_generation >= 0),
        is_invalidated INTEGER NOT NULL DEFAULT 0 CHECK (is_invalidated IN (0, 1)),
        invalidation_reason TEXT NULL,
        last_full_enumeration_at TEXT NULL,
        notification_state TEXT NOT NULL DEFAULT 'unconfigured' CHECK (
          notification_state IN ('unconfigured', 'healthy', 'degraded', 'expired')
        ),
        notification_metadata_json TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES sync_identity(workspace_id) ON DELETE CASCADE,
        UNIQUE(provider, workspace_id)
      );

      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        entity_kind TEXT NOT NULL CHECK (
          entity_kind IN ('workspace', 'configuration', 'note', 'asset')
        ),
        entity_id TEXT NULL,
        conflict_type TEXT NOT NULL CHECK (
          conflict_type IN (
            'edit-edit',
            'edit-delete',
            'uuid-collision',
            'invalid-reference',
            'remote-corruption'
          )
        ),
        field_paths_json TEXT NULL,
        base_hash TEXT NULL CHECK (base_hash IS NULL OR length(base_hash) = 64),
        local_hash TEXT NULL CHECK (local_hash IS NULL OR length(local_hash) = 64),
        remote_hash TEXT NULL CHECK (remote_hash IS NULL OR length(remote_hash) = 64),
        base_document_json TEXT NULL,
        local_document_json TEXT NULL,
        remote_document_json TEXT NULL,
        resolution_state TEXT NOT NULL DEFAULT 'unresolved' CHECK (
          resolution_state IN ('unresolved', 'resolved-local', 'resolved-remote', 'resolved-merged')
        ),
        conflict_copy_entity_id TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT NULL,
        FOREIGN KEY (workspace_id) REFERENCES sync_identity(workspace_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sync_remote_objects_entity
        ON sync_remote_objects(workspace_id, entity_kind, entity_id);
      CREATE INDEX IF NOT EXISTS idx_sync_remote_objects_provider_object
        ON sync_remote_objects(provider, provider_object_id);
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolution
        ON sync_conflicts(workspace_id, resolution_state);
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity
        ON sync_conflicts(workspace_id, entity_kind, entity_id);
    `)

    const identity = {
      deviceId: uuidV4(),
      workspaceId: uuidV4(),
    }

    database
      .prepare(
        `
        INSERT OR IGNORE INTO sync_identity (id, device_id, workspace_id)
        VALUES (1, @deviceId, @workspaceId)
      `
      )
      .run(identity)

    const storedIdentity = database
      .prepare('SELECT workspace_id FROM sync_identity WHERE id = 1')
      .get() as { workspace_id: string }

    database
      .prepare(
        `
        INSERT OR IGNORE INTO sync_account_state (
          id,
          workspace_id,
          is_enabled,
          active_provider,
          connection_state
        ) VALUES (1, ?, 0, NULL, 'disabled')
      `
      )
      .run(storedIdentity.workspace_id)
  },
}
