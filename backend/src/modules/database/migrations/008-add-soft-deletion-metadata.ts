import { v4 as uuidV4 } from 'uuid'
import type { DatabaseMigration } from '../database-migration'

const mutationColumns = `
  mutation_id TEXT NULL,
  modified_by_device_id TEXT NULL,
  modified_at TEXT NULL,
  deleted_at TEXT NULL,
  deletion_mutation_id TEXT NULL,
  deletion_device_id TEXT NULL,
  CHECK (
    (deleted_at IS NULL AND deletion_mutation_id IS NULL AND deletion_device_id IS NULL) OR
    (deleted_at IS NOT NULL AND deletion_mutation_id IS NOT NULL AND deletion_device_id IS NOT NULL)
  )
`

const backfillMutationMetadata = (
  database: Parameters<DatabaseMigration['up']>[0],
  tableName: string,
  idColumn: string,
  deviceId: string
): void => {
  const rows = database
    .prepare(`SELECT ${idColumn} AS id, updated_at FROM ${tableName}`)
    .all() as Array<{ id: string; updated_at: string }>
  const update = database.prepare(`
    UPDATE ${tableName}
    SET mutation_id = ?, modified_by_device_id = ?, modified_at = ?
    WHERE ${idColumn} = ?
  `)

  for (const row of rows) {
    update.run(uuidV4(), deviceId, row.updated_at, row.id)
  }
}

export const addSoftDeletionMetadataMigration: DatabaseMigration = {
  id: '008-add-soft-deletion-metadata',
  requiresBackup: true,
  up: (database) => {
    database.pragma('defer_foreign_keys = ON')
    database.exec(`
      DROP INDEX IF EXISTS idx_note_values_column_id;
      DROP INDEX IF EXISTS idx_notes_created_at;
      DROP INDEX IF EXISTS idx_notes_updated_at;
      DROP INDEX IF EXISTS idx_notes_note_type_id;
      DROP INDEX IF EXISTS idx_note_columns_sort_order;
      DROP INDEX IF EXISTS idx_note_columns_note_type_id;
      DROP INDEX IF EXISTS idx_note_columns_note_type_sort_order;
      DROP INDEX IF EXISTS idx_labels_note_type_id;
      DROP INDEX IF EXISTS idx_labels_created_at;
      DROP INDEX IF EXISTS idx_labels_updated_at;
      DROP INDEX IF EXISTS idx_labels_shared_name_unique;
      DROP INDEX IF EXISTS idx_labels_note_type_name_unique;
      DROP INDEX IF EXISTS idx_note_types_created_at;
      DROP INDEX IF EXISTS idx_note_types_updated_at;

      ALTER TABLE note_values RENAME TO note_values_before_tombstones;
      ALTER TABLE notes RENAME TO notes_before_tombstones;
      ALTER TABLE note_columns RENAME TO note_columns_before_tombstones;
      ALTER TABLE labels RENAME TO labels_before_tombstones;
      ALTER TABLE note_types RENAME TO note_types_before_tombstones;

      CREATE TABLE note_types (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ${mutationColumns}
      );

      CREATE TABLE note_columns (
        id TEXT PRIMARY KEY,
        note_type_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        is_hidden_in_detail INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        config_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ${mutationColumns},
        FOREIGN KEY (note_type_id) REFERENCES note_types(id) ON DELETE RESTRICT
      );

      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        note_type_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        background TEXT DEFAULT NULL CHECK (
          background IS NULL OR background IN (
            'CREAM', 'LEMON', 'LIME', 'PEACH', 'MAUVE', 'SKY', 'FLESH',
            'VERDE', 'ROUGE', 'TEAL', 'OCHRE', 'WHITE', 'SILVER'
          )
        ),
        ${mutationColumns},
        FOREIGN KEY (note_type_id) REFERENCES note_types(id) ON DELETE RESTRICT
      );

      CREATE TABLE note_values (
        note_id TEXT NOT NULL,
        column_id TEXT NOT NULL,
        value_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (note_id, column_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE labels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        note_type_id TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ${mutationColumns},
        FOREIGN KEY (note_type_id) REFERENCES note_types(id) ON DELETE RESTRICT
      );

      INSERT INTO note_types (id, title, created_at, updated_at)
      SELECT id, title, created_at, updated_at FROM note_types_before_tombstones;

      INSERT INTO note_columns (
        id, note_type_id, name, title, type, sort_order, is_hidden,
        is_hidden_in_detail, is_default, config_json, created_at, updated_at
      )
      SELECT
        id, note_type_id, name, title, type, sort_order, is_hidden,
        is_hidden_in_detail, is_default, config_json, created_at, updated_at
      FROM note_columns_before_tombstones;

      INSERT INTO notes (
        id, note_type_id, created_at, updated_at, background
      )
      SELECT id, note_type_id, created_at, updated_at, background
      FROM notes_before_tombstones;

      INSERT INTO note_values (
        note_id, column_id, value_json, created_at, updated_at
      )
      SELECT note_id, column_id, value_json, created_at, updated_at
      FROM note_values_before_tombstones;

      INSERT INTO labels (
        id, title, name, color, note_type_id, created_at, updated_at
      )
      SELECT id, title, name, color, note_type_id, created_at, updated_at
      FROM labels_before_tombstones;

      DROP TABLE note_values_before_tombstones;
      DROP TABLE notes_before_tombstones;
      DROP TABLE note_columns_before_tombstones;
      DROP TABLE labels_before_tombstones;
      DROP TABLE note_types_before_tombstones;

      ALTER TABLE app_settings ADD COLUMN mutation_id TEXT NULL;
      ALTER TABLE app_settings ADD COLUMN modified_by_device_id TEXT NULL;
      ALTER TABLE app_settings ADD COLUMN modified_at TEXT NULL;

      CREATE INDEX idx_note_types_created_at ON note_types(created_at);
      CREATE INDEX idx_note_types_updated_at ON note_types(updated_at);
      CREATE UNIQUE INDEX idx_note_types_live_title_unique
        ON note_types(title) WHERE deleted_at IS NULL;
      CREATE INDEX idx_note_types_deleted_at ON note_types(deleted_at);

      CREATE INDEX idx_note_columns_sort_order ON note_columns(sort_order);
      CREATE INDEX idx_note_columns_note_type_id ON note_columns(note_type_id);
      CREATE INDEX idx_note_columns_note_type_sort_order
        ON note_columns(note_type_id, sort_order);
      CREATE UNIQUE INDEX idx_note_columns_live_name_unique
        ON note_columns(note_type_id, name) WHERE deleted_at IS NULL;
      CREATE INDEX idx_note_columns_deleted_at ON note_columns(deleted_at);

      CREATE INDEX idx_notes_created_at ON notes(created_at);
      CREATE INDEX idx_notes_updated_at ON notes(updated_at);
      CREATE INDEX idx_notes_note_type_id ON notes(note_type_id);
      CREATE INDEX idx_notes_deleted_at ON notes(deleted_at);
      CREATE INDEX idx_note_values_column_id ON note_values(column_id);

      CREATE INDEX idx_labels_note_type_id ON labels(note_type_id);
      CREATE INDEX idx_labels_created_at ON labels(created_at);
      CREATE INDEX idx_labels_updated_at ON labels(updated_at);
      CREATE UNIQUE INDEX idx_labels_shared_name_unique
        ON labels(name) WHERE note_type_id IS NULL AND deleted_at IS NULL;
      CREATE UNIQUE INDEX idx_labels_note_type_name_unique
        ON labels(note_type_id, name)
        WHERE note_type_id IS NOT NULL AND deleted_at IS NULL;
      CREATE INDEX idx_labels_deleted_at ON labels(deleted_at);
    `)

    const identity = database
      .prepare('SELECT device_id FROM sync_identity WHERE id = 1')
      .get() as { device_id: string }

    backfillMutationMetadata(database, 'note_types', 'id', identity.device_id)
    backfillMutationMetadata(database, 'note_columns', 'id', identity.device_id)
    backfillMutationMetadata(database, 'notes', 'id', identity.device_id)
    backfillMutationMetadata(database, 'labels', 'id', identity.device_id)
    backfillMutationMetadata(
      database,
      'app_settings',
      'key',
      identity.device_id
    )

    const foreignKeyViolations = database.pragma(
      'foreign_key_check'
    ) as unknown[]

    if (foreignKeyViolations.length > 0) {
      throw new Error('Soft deletion migration produced invalid foreign keys.')
    }
  },
}
