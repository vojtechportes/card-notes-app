import type { SyncRemoteDocument } from '../types/sync-remote-document'

export const canonicalizeSyncDocument = (
  document: SyncRemoteDocument
): SyncRemoteDocument => {
  if (!('entityType' in document) || document.entityType !== 'configuration') {
    return document
  }

  return {
    ...document,
    payload: {
      ...document.payload,
      noteTypes: [...document.payload.noteTypes].sort((left, right) =>
        left.id.localeCompare(right.id)
      ),
      columns: [...document.payload.columns].sort((left, right) =>
        left.id.localeCompare(right.id)
      ),
      labels: [...document.payload.labels].sort((left, right) =>
        left.id.localeCompare(right.id)
      ),
    },
  }
}
