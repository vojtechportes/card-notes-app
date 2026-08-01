import type { Database } from 'better-sqlite3'
import type { MappedSyncDocument } from '../types/mapped-sync-document'
import type { SyncNoteDocument } from '../types/sync-note-document'
import type { BackgroundEnumDto } from '../../notes/types/background-enum.dto'
import type { SyncNoteValue } from '../types/sync-note-value'
import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { mapSyncDocument } from './map-sync-document.util'

export const createLocalNoteSyncDocument = (
  database: Database,
  workspaceId: string,
  noteId: string,
  parentHash: string | null
): MappedSyncDocument<SyncRemoteDocument> | null => {
  const note = database
    .prepare('SELECT * FROM notes WHERE id = ?')
    .get(noteId) as Record<string, unknown> | undefined
  if (!note) {
    return null
  }

  const deletedAt = note.deleted_at === null ? null : String(note.deleted_at)
  const values = Object.fromEntries(
    (
      database
        .prepare(
          'SELECT column_id, value_json FROM note_values WHERE note_id = ?'
        )
        .all(noteId) as Array<{ column_id: string; value_json: string | null }>
    )
      .filter((row) => row.value_json !== null)
      .map((row) => [
        row.column_id,
        JSON.parse(row.value_json as string) as SyncNoteValue,
      ])
  )
  const draft: Omit<SyncNoteDocument, 'contentHash'> = {
    formatVersion: 1,
    workspaceId,
    parentHash,
    mutationId: String(
      deletedAt ? note.deletion_mutation_id : note.mutation_id
    ),
    modifiedBy: String(
      deletedAt ? note.deletion_device_id : note.modified_by_device_id
    ),
    modifiedAt: String(note.modified_at),
    entityType: 'note',
    entityId: noteId,
    deletedAt,
    payload: deletedAt
      ? null
      : {
          noteTypeId: String(note.note_type_id),
          background: note.background as BackgroundEnumDto | null,

          values,
        },
  }

  return mapSyncDocument(draft)
}
