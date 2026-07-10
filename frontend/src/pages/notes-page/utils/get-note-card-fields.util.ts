import type { ColumnDto, NoteDto } from '../../../types/api'
import type { NoteCardField } from '../types/note-card-field'
import { hasNoteCardFieldValue } from './has-note-card-field-value.util'
import { getNoteDisplayFields } from './get-note-display-fields.util'

export const getNoteCardFields = (
  note: NoteDto,
  columns: ColumnDto[],
  cardFieldDisplayCount: number | null,
  mergeDateTimeFields: boolean,
  mergedDateTitle: string
): NoteCardField[] => {
  const visibleFields = getNoteDisplayFields(note, columns, {
    includeDefaultHiddenFields: false,
    mergeDateTimeFields,
    mergedDateTitle,
  }).filter(hasNoteCardFieldValue)

  if (cardFieldDisplayCount === null) {
    return visibleFields
  }

  return visibleFields.slice(0, cardFieldDisplayCount)
}
