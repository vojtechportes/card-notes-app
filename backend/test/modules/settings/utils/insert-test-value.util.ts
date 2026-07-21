import type { Database } from 'better-sqlite3'

export const insertTestValue = (
  database: Database,
  noteId: string,
  columnId: string,
  value: unknown
): void => {
  database
    .prepare(
      `
      INSERT INTO note_values (note_id, column_id, value_json)
      VALUES (?, ?, ?)
    `
    )
    .run(noteId, columnId, JSON.stringify(value))
}
