import type { Database } from 'better-sqlite3'

export const readTestValue = (
  database: Database,
  noteId: string,
  columnId: string
): unknown => {
  const row = database
    .prepare(
      'SELECT value_json FROM note_values WHERE note_id = ? AND column_id = ?'
    )
    .get(noteId, columnId) as { value_json: string }

  return JSON.parse(row.value_json) as unknown
}
