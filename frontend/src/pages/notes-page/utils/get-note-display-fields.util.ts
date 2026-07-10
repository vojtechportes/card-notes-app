import type { ColumnDto, NoteDto } from '../../../types/api'
import type { NoteCardField } from '../types/note-card-field'
import { resolveNoteCardColumnValue } from './resolve-note-card-column-value.util'

interface GetNoteDisplayFieldsOptions {
  includeDefaultHiddenFields: boolean
  mergeDateTimeFields: boolean
  mergedDateTitle: string
}

export const getNoteDisplayFields = (
  note: NoteDto,
  columns: ColumnDto[],
  options: GetNoteDisplayFieldsOptions
): NoteCardField[] => {
  const visibleColumns = columns
    .filter((column) => {
      if (options.includeDefaultHiddenFields && column.isDefault) {
        return true
      }

      return !column.isHidden
    })
    .sort(
      (leftColumn, rightColumn) => leftColumn.sortOrder - rightColumn.sortOrder
    )

  const fields: NoteCardField[] = []
  let hasMergedDateField = false

  visibleColumns.forEach((column) => {
    const isDateMetadataColumn =
      column.isDefault &&
      (column.name === 'createdAt' || column.name === 'updatedAt')

    if (options.mergeDateTimeFields && isDateMetadataColumn) {
      if (!hasMergedDateField) {
        fields.push({
          columnId: 'last-updated-at',
          title: options.mergedDateTitle,
          type: 'date',
          value: note.updatedAt ?? note.createdAt,
        })
        hasMergedDateField = true
      }

      return
    }

    fields.push({
      columnId: column.id,
      title: column.title,
      type: column.type,
      value: resolveNoteCardColumnValue(note, column),
    })
  })

  return fields
}
