import type { DatabaseMigration } from '../database-migration'

export const addNoteBackgroundMigration: DatabaseMigration = {
  id: '005-add-note-background',
  up: (database) => {
    database.exec(`
      ALTER TABLE notes
      ADD COLUMN background TEXT DEFAULT NULL
      CHECK (
        background IS NULL OR background IN (
          'CREAM',
          'LEMON',
          'LIME',
          'PEACH',
          'MAUVE',
          'SKY',
          'FLESH',
          'VERDE',
          'ROUGE',
          'TEAL',
          'OCHRE',
          'WHITE',
          'SILVER'
        )
      );
    `)
  },
}
