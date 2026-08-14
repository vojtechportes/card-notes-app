import type { NotesDataGridColumnWidths } from '../types/notes-data-grid-column-widths'
import { isRecord } from './is-record.util'

export const normalizeNotesDataGridColumnWidths = (
  value: unknown
): NotesDataGridColumnWidths | null => {
  if (!isRecord(value)) {
    return null
  }

  const normalizedWidths: NotesDataGridColumnWidths = {}

  for (const [noteTypeId, columnWidths] of Object.entries(value)) {
    if (noteTypeId.trim().length === 0 || !isRecord(columnWidths)) {
      return null
    }

    const normalizedColumnWidths: Record<string, number> = {}

    for (const [columnId, width] of Object.entries(columnWidths)) {
      if (columnId.trim().length === 0) {
        return null
      }

      if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
        normalizedColumnWidths[columnId] = width
      }
    }

    normalizedWidths[noteTypeId] = normalizedColumnWidths
  }

  return normalizedWidths
}
