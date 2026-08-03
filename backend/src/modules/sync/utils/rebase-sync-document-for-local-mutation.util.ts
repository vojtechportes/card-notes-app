import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { mapSyncDocument } from './map-sync-document.util'

export const rebaseSyncDocumentForLocalMutation = (
  document: SyncRemoteDocument,
  parentHash: string | null,
  mutationId: string,
  modifiedBy: string,
  modifiedAt: string
): SyncRemoteDocument => {
  if (!('entityType' in document)) {
    throw new Error('Workspace documents cannot resolve entity conflicts.')
  }

  if (document.entityType === 'note') {
    return mapSyncDocument({
      formatVersion: document.formatVersion,
      workspaceId: document.workspaceId,
      parentHash,
      mutationId,
      modifiedBy,
      modifiedAt,
      entityType: 'note',
      entityId: document.entityId,
      deletedAt: document.deletedAt,
      payload: document.payload,
    }).document
  }

  return mapSyncDocument({
    formatVersion: document.formatVersion,
    workspaceId: document.workspaceId,
    parentHash,
    mutationId,
    modifiedBy,
    modifiedAt,
    entityType: 'configuration',
    entityId: 'configuration',
    payload: document.payload,
  }).document
}
