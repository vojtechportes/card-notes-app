import type { Database } from 'better-sqlite3'
import type { SyncNoteDocument } from '../types/sync-note-document'

export const applyRemoteNoteDocument = (
  database: Database,
  document: SyncNoteDocument
): void => {
  if (document.deletedAt) {
    database
      .prepare(
        `UPDATE notes SET deleted_at = @deletedAt,
      deletion_mutation_id = @mutationId, deletion_device_id = @modifiedBy,
      mutation_id = @mutationId, modified_by_device_id = @modifiedBy,
      modified_at = @modifiedAt, updated_at = @modifiedAt WHERE id = @id`
      )
      .run({
        id: document.entityId,
        deletedAt: document.deletedAt,
        mutationId: document.mutationId,
        modifiedBy: document.modifiedBy,
        modifiedAt: document.modifiedAt,
      })
    return
  }

  if (!document.payload) {
    throw new Error('Live remote note is missing its payload.')
  }

  database
    .prepare(
      `
    INSERT INTO notes (
      id, note_type_id, background, created_at, updated_at, mutation_id,
      modified_by_device_id, modified_at
    ) VALUES (
      @id, @noteTypeId, @background, @modifiedAt, @modifiedAt, @mutationId,
      @modifiedBy, @modifiedAt
    ) ON CONFLICT(id) DO UPDATE SET
      note_type_id = excluded.note_type_id, background = excluded.background,
      updated_at = excluded.updated_at, mutation_id = excluded.mutation_id,
      modified_by_device_id = excluded.modified_by_device_id,
      modified_at = excluded.modified_at, deleted_at = NULL,
      deletion_mutation_id = NULL, deletion_device_id = NULL
  `
    )
    .run({
      id: document.entityId,
      noteTypeId: document.payload.noteTypeId,
      background: document.payload.background,
      mutationId: document.mutationId,
      modifiedBy: document.modifiedBy,
      modifiedAt: document.modifiedAt,
    })
  database
    .prepare('DELETE FROM note_values WHERE note_id = ?')
    .run(document.entityId)
  const insertValue = database.prepare(`INSERT INTO note_values (
    note_id, column_id, value_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?)`)
  for (const [columnId, value] of Object.entries(document.payload.values)) {
    insertValue.run(
      document.entityId,
      columnId,
      JSON.stringify(value),
      document.modifiedAt,
      document.modifiedAt
    )
  }
}
