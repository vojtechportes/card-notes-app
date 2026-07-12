import type MiniSearch from 'minisearch'
import type { NoteDto } from '../../../types/api'
import type { NoteSearchDocument } from '../types/note-search-document'
import { createNotesSearchIndex } from './create-notes-search-index.util'

export const searchNotes = (
  notes: NoteDto[],
  searchQuery: string,
  noteTypeTitleById: Record<string, string>,
  searchIndex: MiniSearch<NoteSearchDocument> = createNotesSearchIndex(
    notes,
    noteTypeTitleById
  )
): NoteDto[] => {
  const normalizedSearchQuery = searchQuery.trim()

  if (normalizedSearchQuery === '') {
    return notes
  }

  const matchedNoteIds = new Set(
    searchIndex.search(normalizedSearchQuery).map((result) => String(result.id))
  )

  return notes.filter((note) => matchedNoteIds.has(note.id))
}
