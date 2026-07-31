import type { SyncEntityKindEnum } from './sync-entity-kind-enum'
import type { SyncMutationIntentEnum } from './sync-mutation-intent-enum'

export interface EnqueueSyncOutboxMutationInput {
  entityKind: SyncEntityKindEnum
  entityId: string
  intent: SyncMutationIntentEnum
  mutationId: string
  modifiedAt: string
}
