import type { DatabaseMigration } from '../database-migration'

export const addDetailColumnVisibilityMigration: DatabaseMigration = {
  id: '004-add-detail-column-visibility',
  up: (database) => {
    database.exec(`
      ALTER TABLE note_columns
      ADD COLUMN is_hidden_in_detail INTEGER NOT NULL DEFAULT 0;

      UPDATE note_columns
      SET is_hidden_in_detail = is_hidden
      WHERE is_default = 0;
    `)
  },
}
