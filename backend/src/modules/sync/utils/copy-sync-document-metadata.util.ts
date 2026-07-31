import type { SyncConfigurationDocument } from '../types/sync-configuration-document'
import type { SyncNoteDocument } from '../types/sync-note-document'

export const copySyncDocumentMetadata = (
  document: SyncConfigurationDocument | SyncNoteDocument
) => ({
  formatVersion: document.formatVersion,
  workspaceId: document.workspaceId,
  contentHash: document.contentHash,
  parentHash: document.parentHash,
  mutationId: document.mutationId,
  modifiedBy: document.modifiedBy,
  modifiedAt: document.modifiedAt,
})
