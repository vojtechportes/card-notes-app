import type { SyncEntityKindEnum } from './sync-entity-kind-enum'
import type { SyncMutationIntentEnum } from './sync-mutation-intent-enum'

export interface SyncMutation {
  mutationId: string
  workspaceId: string
  entityKind: SyncEntityKindEnum
  entityId: string
  intent: SyncMutationIntentEnum
  baseHash: string | null
  targetHash: string
  originatingDeviceId: string
  createdAt: string
}
