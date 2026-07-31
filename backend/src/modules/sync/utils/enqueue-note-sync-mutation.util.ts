import type { Database } from 'better-sqlite3'
import type { LocalMutationMetadata } from './create-local-mutation-metadata.util'
import { enqueueSyncOutboxMutation } from './enqueue-sync-outbox-mutation.util'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from '../types/sync-mutation-intent-enum'

export const enqueueNoteSyncMutation = (
  database: Database,
  noteId: string,
  mutation: LocalMutationMetadata,
  isTombstone = false
): void => {
  enqueueSyncOutboxMutation(database, {
    entityKind: SyncEntityKindEnum.Note,
    entityId: noteId,
    intent: isTombstone
      ? SyncMutationIntentEnum.Tombstone
      : SyncMutationIntentEnum.Upsert,
    mutationId: mutation.mutationId,
    modifiedAt: mutation.modifiedAt,
  })
}
