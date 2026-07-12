import { v4 as uuidV4 } from 'uuid'
import type { DatabaseMigration } from '../database-migration'
import { defaultNoteColumns } from '../../settings/constants/default-note-columns'
import { defaultNoteTypeTitle } from '../../settings/constants/default-note-type'

interface NoteTypeIdRow {
  id: string
}

export const addNoteTypesMigration: DatabaseMigration = {
  id: '002-add-note-types',
  up: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS note_types (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_note_types_created_at ON note_types(created_at);
      CREATE INDEX IF NOT EXISTS idx_note_types_updated_at ON note_types(updated_at);
    `)

    let defaultNoteType = database
      .prepare('SELECT id FROM note_types WHERE title = ? LIMIT 1')
      .get(defaultNoteTypeTitle) as NoteTypeIdRow | undefined

    if (!defaultNoteType) {
      defaultNoteType = {
        id: uuidV4(),
      }
      database
        .prepare(
          `
          INSERT INTO note_types (id, title)
          VALUES (?, ?)
        `
        )
        .run(defaultNoteType.id, defaultNoteTypeTitle)
    }

    const defaultNoteTypeId = defaultNoteType.id

    database.exec(`
      DROP INDEX IF EXISTS idx_note_columns_sort_order;
      ALTER TABLE note_columns RENAME TO note_columns_legacy;

      CREATE TABLE note_columns (
        id TEXT PRIMARY KEY,
        note_type_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        config_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(note_type_id, name),
        FOREIGN KEY (note_type_id) REFERENCES note_types(id) ON DELETE CASCADE
      );
    `)

    database
      .prepare(
        `
        INSERT INTO note_columns (
          id,
          note_type_id,
          name,
          title,
          type,
          sort_order,
          is_hidden,
          is_default,
          config_json,
          created_at,
          updated_at
        )
        SELECT
          id,
          ?,
          name,
          title,
          type,
          sort_order,
          is_hidden,
          is_default,
          config_json,
          created_at,
          updated_at
        FROM note_columns_legacy
      `
      )
      .run(defaultNoteTypeId)

    database.exec(`
      DROP TABLE note_columns_legacy;
      CREATE INDEX idx_note_columns_sort_order ON note_columns(sort_order);
      CREATE INDEX idx_note_columns_note_type_id ON note_columns(note_type_id);
      CREATE INDEX idx_note_columns_note_type_sort_order ON note_columns(note_type_id, sort_order);

      DROP INDEX IF EXISTS idx_note_values_column_id;
      ALTER TABLE note_values RENAME TO note_values_legacy;
      DROP INDEX IF EXISTS idx_notes_created_at;
      DROP INDEX IF EXISTS idx_notes_updated_at;
      ALTER TABLE notes RENAME TO notes_legacy;

      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        note_type_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    `)

    database
      .prepare(
        `
        INSERT INTO notes (
          id,
          note_type_id,
          created_at,
          updated_at
        )
        SELECT
          id,
          ?,
          created_at,
          updated_at
        FROM notes_legacy
      `
      )
      .run(defaultNoteTypeId)

    database.exec(`
      INSERT INTO note_values (
        note_id,
        column_id,
        value_json,
        created_at,
        updated_at
      )
      SELECT
        note_id,
        column_id,
        value_json,
        created_at,
        updated_at
      FROM note_values_legacy;

      DROP TABLE note_values_legacy;
      DROP TABLE notes_legacy;
      CREATE INDEX idx_notes_created_at ON notes(created_at);
      CREATE INDEX idx_notes_updated_at ON notes(updated_at);
      CREATE INDEX idx_notes_note_type_id ON notes(note_type_id);
      CREATE INDEX idx_note_values_column_id ON note_values(column_id);
    `)

    const noteTypeIds = (
      database.prepare('SELECT id FROM note_types ORDER BY created_at ASC, id ASC').all() as NoteTypeIdRow[]
    ).map((row) => row.id)
    const existingDefaultColumns = database.prepare(
      `
      SELECT name FROM note_columns
      WHERE note_type_id = ?
        AND is_default = 1
    `
    )
    const insertDefaultColumn = database.prepare(`
      INSERT INTO note_columns (
        id,
        note_type_id,
        name,
        title,
        type,
        sort_order,
        is_hidden,
        is_default,
        config_json
      ) VALUES (
        @id,
        @noteTypeId,
        @name,
        @title,
        @type,
        @sortOrder,
        0,
        1,
        NULL
      )
    `)

    for (const noteTypeId of noteTypeIds) {
      const existingDefaultColumnNames = new Set(
        (
          existingDefaultColumns.all(noteTypeId) as Array<{ name: string }>
        ).map((row) => row.name)
      )

      for (const column of defaultNoteColumns) {
        if (existingDefaultColumnNames.has(column.name)) {
          continue
        }

        insertDefaultColumn.run({
          id: uuidV4(),
          noteTypeId,
          name: column.name,
          title: column.title,
          type: column.type,
          sortOrder: column.sortOrder,
        })
      }
    }
  },
}
