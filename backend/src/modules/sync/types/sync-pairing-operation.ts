import type { SyncPairingDecisionEnum } from './sync-pairing-decision-enum'
import type { SyncPairingModeEnum } from './sync-pairing-mode-enum'
import type { SyncPairingOperationTypeEnum } from './sync-pairing-operation-type-enum'
import type { SyncPairingStatusEnum } from './sync-pairing-status-enum'
import type { SyncProviderEnum } from './sync-provider-enum'

export interface SyncPairingOperation {
  id: string
  operationType: SyncPairingOperationTypeEnum
  targetProvider: SyncProviderEnum
  accountId: string
  accountDisplayName: string | null
  localWorkspaceId: string
  remoteWorkspaceId: string | null
  remoteWorkspaceDisplayName: string | null
  mode: SyncPairingModeEnum
  status: SyncPairingStatusEnum
  localIsPopulated: boolean
  remoteIsPopulated: boolean
  pendingMutationCount: number
  retainPendingWork: boolean
  previousProvider: SyncProviderEnum | null
  previousAccountId: string | null
  backupPath: string | null
  decision: SyncPairingDecisionEnum | null
  errorCode: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
