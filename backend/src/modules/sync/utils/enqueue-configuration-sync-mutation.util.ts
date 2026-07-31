import type { Database } from 'better-sqlite3'
import type { LocalMutationMetadata } from './create-local-mutation-metadata.util'
import { enqueueSyncOutboxMutation } from './enqueue-sync-outbox-mutation.util'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from '../types/sync-mutation-intent-enum'

export const enqueueConfigurationSyncMutation = (
  database: Database,
  mutation: LocalMutationMetadata
): void => {
  enqueueSyncOutboxMutation(database, {
    entityKind: SyncEntityKindEnum.Configuration,
    entityId: 'configuration',
    intent: SyncMutationIntentEnum.Upsert,
    mutationId: mutation.mutationId,
    modifiedAt: mutation.modifiedAt,
  })
}
