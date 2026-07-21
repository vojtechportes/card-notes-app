import type { Database } from 'better-sqlite3'

export const insertTestColumn = (
  database: Database,
  id: string,
  noteTypeId: string,
  name: string,
  type: string
): void => {
  database
    .prepare(
      `
      INSERT INTO note_columns (
        id, note_type_id, name, title, type, sort_order, is_hidden, is_default, config_json
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL)
    `
    )
    .run(id, noteTypeId, name, name, type, 10)
}
