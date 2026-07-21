import type { DatabaseMigration } from '../database-migration'

export const addLabelsMigration: DatabaseMigration = {
  id: '003-add-labels',
  up: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        note_type_id TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_type_id) REFERENCES note_types(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_labels_note_type_id
        ON labels(note_type_id);
      CREATE INDEX IF NOT EXISTS idx_labels_created_at
        ON labels(created_at);
      CREATE INDEX IF NOT EXISTS idx_labels_updated_at
        ON labels(updated_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_labels_shared_name_unique
        ON labels(name)
        WHERE note_type_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_labels_note_type_name_unique
        ON labels(note_type_id, name)
        WHERE note_type_id IS NOT NULL;
    `)
  },
}
