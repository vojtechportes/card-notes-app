import type { MappedSyncDocument } from './mapped-sync-document'
import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface PulledSyncDocument {
  mappedDocument: MappedSyncDocument<SyncRemoteDocument>
  metadata: SyncProviderObjectMetadata
  applyToDomain: boolean
  acknowledgeOutbox: boolean
}
