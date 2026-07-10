import type { ColumnDto, NoteDto } from '../../../types/api'
import type { NoteCardFieldValue } from '../types/note-card-field'

export const resolveNoteCardColumnValue = (
  note: NoteDto,
  column: ColumnDto
): NoteCardFieldValue | undefined => {
  if (column.isDefault && column.name === 'createdAt') {
    return note.createdAt
  }

  if (column.isDefault && column.name === 'updatedAt') {
    return note.updatedAt
  }

  return note.values[column.id]
}
