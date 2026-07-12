import type { NoteDto } from '../../../types/api'
import type { NoteSearchDocument } from '../types/note-search-document'
import { normalizeNoteSearchValue } from './normalize-note-search-value.util'

export const createNoteSearchDocument = (
  note: NoteDto,
  noteTypeTitleById: Record<string, string>
): NoteSearchDocument => {
  const noteTypeTitle = noteTypeTitleById[note.noteTypeId] ?? ''

  return {
    createdAt: note.createdAt,
    id: note.id,
    noteTypeId: note.noteTypeId,
    noteTypeTitle,
    searchableText: [
      noteTypeTitle,
      ...Object.values(note.values).map((value) =>
        normalizeNoteSearchValue(value)
      ),
    ]
      .filter(Boolean)
      .join(' '),
    updatedAt: note.updatedAt,
  }
}
