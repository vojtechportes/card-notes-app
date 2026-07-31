import type { SyncMergeConflict } from './sync-merge-conflict'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface SyncDocumentMergeResult {
  document: SyncRemoteDocument
  conflicts: SyncMergeConflict[]
}
