import type { SyncRemoteDocument } from './sync-remote-document'

export interface MappedSyncDocument<TDocument extends SyncRemoteDocument> {
  logicalKey: string
  document: TDocument
  canonicalJson: string
  contentHash: string
}
