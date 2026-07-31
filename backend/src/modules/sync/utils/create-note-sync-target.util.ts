import type { Database } from 'better-sqlite3'

export const createNoteSyncTarget = (
  database: Database,
  noteId: string
): unknown => {
  const note = database
    .prepare(
      `SELECT
        id,
        note_type_id AS noteTypeId,
        background,
        created_at AS createdAt,
        updated_at AS updatedAt,
        mutation_id AS mutationId,
        modified_by_device_id AS modifiedByDeviceId,
        modified_at AS modifiedAt,
        deleted_at AS deletedAt,
        deletion_mutation_id AS deletionMutationId,
        deletion_device_id AS deletionDeviceId
      FROM notes WHERE id = ?`
    )
    .get(noteId)
  const values = (
    database
      .prepare(
        `SELECT column_id, value_json
         FROM note_values WHERE note_id = ? ORDER BY column_id ASC`
      )
      .all(noteId) as Array<{ column_id: string; value_json: string | null }>
  ).map((row) => ({
    columnId: row.column_id,
    value:
      row.value_json === null ? null : (JSON.parse(row.value_json) as unknown),
  }))

  return { note: note ?? null, values }
}
