import type { SyncErrorClassificationEnum } from './sync-error-classification-enum'
import type { SyncProviderEnum } from './sync-provider-enum'
import type { SyncStatusStateEnum } from './sync-status-state-enum'
import type { SyncTriggerEnum } from './sync-trigger-enum'

export interface SyncPublicStatus {
  state: SyncStatusStateEnum
  isEnabled: boolean
  provider: SyncProviderEnum | null
  accountId: string | null
  accountDisplayName: string | null
  workspaceId: string | null
  workspaceDisplayName: string | null
  pendingMutationCount: number
  unresolvedConflictCount: number
  lastAttemptedAt: string | null
  lastSucceededAt: string | null
  lastErrorClassification: SyncErrorClassificationEnum | null
  lastTrigger: SyncTriggerEnum | null
  isStartupReady: boolean
  dataRevision: number
}
