import type { SyncColumnPayload } from './sync-column-payload'

export interface ParseSyncDocumentOptions {
  expectedWorkspaceId: string
  knownNoteTypeIds?: ReadonlySet<string>
  columnsById?: ReadonlyMap<string, SyncColumnPayload>
  knownLabelIds?: ReadonlySet<string>
}
