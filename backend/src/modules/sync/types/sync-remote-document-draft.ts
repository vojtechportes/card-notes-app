import type { SyncConfigurationDocument } from './sync-configuration-document'
import type { SyncNoteDocument } from './sync-note-document'
import type { WorkspaceDocument } from './workspace-document'

export type SyncRemoteDocumentDraft =
  | WorkspaceDocument
  | Omit<SyncConfigurationDocument, 'contentHash'>
  | Omit<SyncNoteDocument, 'contentHash'>
