import type { SyncEntityKindEnum } from './sync-entity-kind-enum'
import type { SyncProviderEnum } from './sync-provider-enum'

export interface ReconciledSyncDocumentState {
  workspaceId: string
  provider: SyncProviderEnum
  logicalKey: string
  entityKind: SyncEntityKindEnum
  entityId: string
  providerObjectId: string
  providerVersion: string
  contentHash: string
  mergeBaseJson: string
}
