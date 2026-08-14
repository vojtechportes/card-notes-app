import type { ColumnDto, NoteTypeDto } from '../../../types/api'
import type { NotesDataGridColumnWidths } from '../types/notes-data-grid-column-widths'

export const reconcileNotesDataGridColumnWidths = (
  widths: NotesDataGridColumnWidths,
  noteTypes: NoteTypeDto[],
  columnsByNoteTypeId: Record<string, ColumnDto[]>
): NotesDataGridColumnWidths => {
  const reconciledWidths: NotesDataGridColumnWidths = {}

  for (const noteType of noteTypes) {
    const noteTypeWidths = widths[noteType.id]

    if (!noteTypeWidths) {
      continue
    }

    const columnIds = new Set(
      (columnsByNoteTypeId[noteType.id] ?? []).map((column) => column.id)
    )
    const reconciledNoteTypeWidths = Object.fromEntries(
      Object.entries(noteTypeWidths).filter(([columnId]) =>
        columnIds.has(columnId)
      )
    )

    if (Object.keys(reconciledNoteTypeWidths).length > 0) {
      reconciledWidths[noteType.id] = reconciledNoteTypeWidths
    }
  }

  return reconciledWidths
}
