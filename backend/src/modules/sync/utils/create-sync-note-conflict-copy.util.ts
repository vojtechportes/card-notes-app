import type { SyncNoteDocument } from '../types/sync-note-document'
import { mapSyncDocument } from './map-sync-document.util'

export const createSyncNoteConflictCopy = (
  document: SyncNoteDocument,
  entityId: string,
  mutationId: string,
  modifiedBy: string,
  modifiedAt: string
): SyncNoteDocument => {
  if (!document.payload) {
    throw new Error('A note conflict copy requires live note content.')
  }

  return mapSyncDocument({
    formatVersion: document.formatVersion,
    workspaceId: document.workspaceId,
    parentHash: null,
    mutationId,
    modifiedBy,
    modifiedAt,
    entityType: 'note',
    entityId,
    deletedAt: null,
    payload: document.payload,
  }).document as SyncNoteDocument
}
