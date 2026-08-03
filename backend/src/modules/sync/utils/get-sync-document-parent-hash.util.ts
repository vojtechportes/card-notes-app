import type { SyncRemoteDocument } from '../types/sync-remote-document'

export const getSyncDocumentParentHash = (
  document: SyncRemoteDocument | null
): string | null => {
  if (!document || !('parentHash' in document)) {
    return null
  }

  return document.parentHash
}
