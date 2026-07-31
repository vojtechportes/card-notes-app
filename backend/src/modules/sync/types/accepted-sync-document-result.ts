import type { MappedSyncDocument } from './mapped-sync-document'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface AcceptedSyncDocumentResult {
  status: 'accepted'
  mappedDocument: MappedSyncDocument<SyncRemoteDocument>
}
