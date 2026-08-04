import type { SyncPairingModeEnum } from './sync-pairing-mode-enum'
import type { SyncPairingOperationTypeEnum } from './sync-pairing-operation-type-enum'
import type { SyncProviderEnum } from './sync-provider-enum'

export interface CreateSyncPairingOperationInput {
  operationType: SyncPairingOperationTypeEnum
  targetProvider: SyncProviderEnum
  accountId: string
  accountDisplayName: string | null
  localWorkspaceId: string
  remoteWorkspaceId: string | null
  remoteWorkspaceDisplayName: string | null
  mode: SyncPairingModeEnum
  localIsPopulated: boolean
  remoteIsPopulated: boolean
  pendingMutationCount: number
  retainPendingWork: boolean
  previousProvider: SyncProviderEnum | null
  previousAccountId: string | null
}
