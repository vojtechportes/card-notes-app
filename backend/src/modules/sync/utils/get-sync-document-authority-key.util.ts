import type { SyncRemoteDocument } from '../types/sync-remote-document'

export const getSyncDocumentAuthorityKey = (
  document: SyncRemoteDocument
): string => {
  if (!('mutationId' in document)) {
    return document.workspaceId
  }

  return `${document.mutationId}:${document.modifiedBy}:${document.contentHash}`
}
