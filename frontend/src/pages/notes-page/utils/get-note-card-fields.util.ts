import type { ColumnDto, NoteDto } from '../../../types/api';
import type { NoteCardField } from '../types/note-card-field';
import { hasNoteCardFieldValue } from './has-note-card-field-value.util';
import { resolveNoteCardColumnValue } from './resolve-note-card-column-value.util';

export const getNoteCardFields = (
  note: NoteDto,
  columns: ColumnDto[],
  cardFieldDisplayCount: number | null,
): NoteCardField[] => {
  const visibleFields = columns
    .filter((column) => !column.isHidden)
    .sort((leftColumn, rightColumn) => leftColumn.sortOrder - rightColumn.sortOrder)
    .map((column) => ({
      columnId: column.id,
      title: column.title,
      type: column.type,
      value: resolveNoteCardColumnValue(note, column),
    }))
    .filter(hasNoteCardFieldValue);

  if (cardFieldDisplayCount === null) {
    return visibleFields;
  }

  return visibleFields.slice(0, cardFieldDisplayCount);
};
