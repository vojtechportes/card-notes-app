import type { Database } from 'better-sqlite3'

export const insertTestNote = (
  database: Database,
  id: string,
  noteTypeId: string
): void => {
  database
    .prepare(
      `
      INSERT INTO notes (id, note_type_id, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    )
    .run(id, noteTypeId)
}
