import type { SyncDocumentMergeResult } from '../types/sync-document-merge-result'
import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { mergeSyncConfigurationDocument } from './merge-sync-configuration-document.util'
import { mergeSyncNoteDocument } from './merge-sync-note-document.util'

export const mergeSyncDocument = (
  base: SyncRemoteDocument | null,
  local: SyncRemoteDocument,
  remote: SyncRemoteDocument
): SyncDocumentMergeResult => {
  if (
    'entityType' in local &&
    local.entityType === 'note' &&
    'entityType' in remote &&
    remote.entityType === 'note'
  ) {
    const noteBase =
      base && 'entityType' in base && base.entityType === 'note' ? base : null

    return mergeSyncNoteDocument(noteBase, local, remote)
  }

  if (
    'entityType' in local &&
    local.entityType === 'configuration' &&
    'entityType' in remote &&
    remote.entityType === 'configuration'
  ) {
    const configurationBase =
      base && 'entityType' in base && base.entityType === 'configuration'
        ? base
        : null

    return mergeSyncConfigurationDocument(configurationBase, local, remote)
  }

  throw new Error('Synchronization documents cannot be merged across kinds.')
}
