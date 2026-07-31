import type { MappedSyncDocument } from './mapped-sync-document'
import type { SyncOutboxEntry } from './sync-outbox-entry'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface ClaimedSyncDocument {
  entry: SyncOutboxEntry
  mappedDocument: MappedSyncDocument<SyncRemoteDocument>
}
