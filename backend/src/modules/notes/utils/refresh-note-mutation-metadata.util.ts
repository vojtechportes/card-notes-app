import type { Database } from 'better-sqlite3'
import { createLocalMutationMetadata } from '../../sync/utils/create-local-mutation-metadata.util'
import { enqueueNoteSyncMutation } from '../../sync/utils/enqueue-note-sync-mutation.util'

export const refreshNoteMutationMetadata = (
  database: Database,
  noteIds: string[],
  timestamp: string
): void => {
  const updateNote = database.prepare(`
    UPDATE notes
    SET updated_at = @updatedAt,
        mutation_id = @mutationId,
        modified_by_device_id = @modifiedByDeviceId,
        modified_at = @modifiedAt
    WHERE id = @id AND deleted_at IS NULL
  `)

  for (const id of noteIds) {
    const mutation = createLocalMutationMetadata(database, timestamp)
    const result = updateNote.run({
      id,
      updatedAt: timestamp,
      ...mutation,
    })

    if (result.changes > 0) {
      enqueueNoteSyncMutation(database, id, mutation)
    }
  }
}
