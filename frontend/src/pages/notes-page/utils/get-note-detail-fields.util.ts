import type { ColumnDto, NoteDto } from '../../../types/api'
import type { NoteCardField } from '../types/note-card-field'
import { getNoteDisplayFields } from './get-note-display-fields.util'

export const getNoteDetailFields = (
  note: NoteDto,
  columns: ColumnDto[],
  mergeDateTimeFields: boolean,
  mergedDateTitle: string
): NoteCardField[] => {
  return getNoteDisplayFields(note, columns, {
    includeDefaultHiddenFields: true,
    mergeDateTimeFields,
    mergedDateTitle,
  })
}
