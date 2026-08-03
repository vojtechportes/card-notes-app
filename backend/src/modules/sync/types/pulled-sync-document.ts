import type { MappedSyncDocument } from './mapped-sync-document'
import type { SyncMergeConflict } from './sync-merge-conflict'
import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface PulledSyncDocument {
  mappedDocument: MappedSyncDocument<SyncRemoteDocument>
  domainMappedDocument?: MappedSyncDocument<SyncRemoteDocument>
  conflicts: SyncMergeConflict[]
  metadata: SyncProviderObjectMetadata
  applyToDomain: boolean
  acknowledgeOutbox: boolean
  enqueueMergedDocument: boolean
}
