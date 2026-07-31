import type { SyncDocumentMetadata } from './sync-document-metadata'
import type { SyncNotePayload } from './sync-note-payload'

export interface SyncNoteDocument extends SyncDocumentMetadata {
  entityType: 'note'
  entityId: string
  deletedAt: string | null
  payload: SyncNotePayload | null
}
