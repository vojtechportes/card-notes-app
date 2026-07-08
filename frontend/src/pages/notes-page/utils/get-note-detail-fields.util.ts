import type { ColumnDto, NoteDto } from '../../../types/api';
import type { NoteCardField } from '../types/note-card-field';
import { resolveNoteCardColumnValue } from './resolve-note-card-column-value.util';

export const getNoteDetailFields = (
  note: NoteDto,
  columns: ColumnDto[],
): NoteCardField[] => {
  return columns
    .filter((column) => column.isDefault || !column.isHidden)
    .sort((leftColumn, rightColumn) => leftColumn.sortOrder - rightColumn.sortOrder)
    .map((column) => ({
      columnId: column.id,
      title: column.title,
      type: column.type,
      value: resolveNoteCardColumnValue(note, column),
    }));
};
