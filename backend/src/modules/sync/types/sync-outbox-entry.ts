import type { SyncEntityKindEnum } from './sync-entity-kind-enum'
import type { SyncMutationIntentEnum } from './sync-mutation-intent-enum'
import type { SyncOutboxStatusEnum } from './sync-outbox-status-enum'

export interface SyncOutboxEntry {
  mutationId: string
  latestMutationId: string
  workspaceId: string
  entityKind: SyncEntityKindEnum
  entityId: string
  logicalKey: string
  intent: SyncMutationIntentEnum
  baseHash: string | null
  targetHash: string
  originatingDeviceId: string
  status: SyncOutboxStatusEnum
  attemptCount: number
  nextAttemptAt: string | null
  lastFailureClassification: string | null
  claimToken: string | null
  claimedBy: string | null
  claimExpiresAt: string | null
  coalescedCount: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
