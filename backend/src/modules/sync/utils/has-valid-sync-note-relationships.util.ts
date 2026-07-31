import type { ParseSyncDocumentOptions } from '../types/parse-sync-document-options'
import type { SyncNoteDocument } from '../types/sync-note-document'
import { isSyncNoteValueValidForColumn } from './is-sync-note-value-valid-for-column.util'

export const hasValidSyncNoteRelationships = (
  document: SyncNoteDocument,
  options: ParseSyncDocumentOptions
): boolean => {
  if (document.payload === null) {
    return true
  }

  if (
    options.knownNoteTypeIds !== undefined &&
    !options.knownNoteTypeIds.has(document.payload.noteTypeId)
  ) {
    return false
  }

  if (options.columnsById === undefined) {
    return true
  }

  return Object.entries(document.payload.values).every(([columnId, value]) => {
    const column = options.columnsById?.get(columnId)

    if (column === undefined) {
      return true
    }

    return (
      column.noteTypeId === document.payload?.noteTypeId &&
      isSyncNoteValueValidForColumn(value, column, options.knownLabelIds)
    )
  })
}
