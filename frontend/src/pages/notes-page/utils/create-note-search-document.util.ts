import type { NoteDto } from '../../../types/api';
import type { NoteSearchDocument } from '../types/note-search-document';
import { normalizeNoteSearchValue } from './normalize-note-search-value.util';

export const createNoteSearchDocument = (note: NoteDto): NoteSearchDocument => {
  return {
    createdAt: note.createdAt,
    id: note.id,
    searchableText: Object.values(note.values)
      .map((value) => normalizeNoteSearchValue(value))
      .filter(Boolean)
      .join(' '),
    updatedAt: note.updatedAt,
  };
};
