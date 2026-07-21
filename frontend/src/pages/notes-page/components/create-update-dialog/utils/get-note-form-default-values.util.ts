import type { ColumnDto, NoteDto } from '../../../../../types/api'
import type { FormValues } from '../types/form-values'
import { isMultiImageColumn } from '../../../../../utils/is-multi-image-column.util'
import { isImageNoteValue } from '../../../utils/is-image-note-value.util'
import { isNoteImageValueList } from '../../../utils/is-note-image-value-list.util'
import { normalizeDateInputValue } from './normalize-date-input-value.util'

export const getNoteFormDefaultValues = (
  columns: ColumnDto[],
  note?: NoteDto
): FormValues => {
  const values = columns.reduce<FormValues['values']>((accumulator, column) => {
    const value = note?.values[column.id]

    if (column.type === 'labels') {
      accumulator[column.id] = Array.isArray(value)
        ? value.filter(
            (labelId): labelId is string => typeof labelId === 'string'
          )
        : []
      return accumulator
    }

    if (column.type === 'image') {
      if (isMultiImageColumn(column)) {
        accumulator[column.id] = isNoteImageValueList(value)
          ? value
          : isImageNoteValue(value)
            ? [value]
            : null
        return accumulator
      }

      accumulator[column.id] = isNoteImageValueList(value)
        ? (value[0] ?? null)
        : isImageNoteValue(value)
          ? value
          : null
      return accumulator
    }

    if (typeof value === 'number') {
      accumulator[column.id] = String(value)
      return accumulator
    }

    if (typeof value === 'string') {
      accumulator[column.id] =
        column.type === 'date' ? normalizeDateInputValue(value) : value
      return accumulator
    }

    accumulator[column.id] = ''
    return accumulator
  }, {})

  return { values }
}
