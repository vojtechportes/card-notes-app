import type { MappedSyncDocument } from './mapped-sync-document'
import type { SyncProviderEnum } from './sync-provider-enum'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface SaveReconciledSyncDocumentInput {
  provider: SyncProviderEnum
  providerObjectId: string
  providerVersion: string
  mappedDocument: MappedSyncDocument<SyncRemoteDocument>
}
