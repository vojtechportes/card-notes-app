import { useMemo } from 'react'
import type { NoteDto } from '../../../types/api'
import { createNotesSearchIndex } from '../utils/create-notes-search-index.util'
import { searchNotes } from '../utils/search-notes.util'

const EMPTY_NOTES: NoteDto[] = []
const EMPTY_NOTE_TYPE_TITLES: Record<string, string> = {}

export const useNotesSearch = (
  notes: NoteDto[] | undefined,
  searchQuery: string,
  noteTypeTitleById: Record<string, string> = EMPTY_NOTE_TYPE_TITLES
): NoteDto[] => {
  const searchableNotes = notes ?? EMPTY_NOTES
  const searchIndex = useMemo(
    () => createNotesSearchIndex(searchableNotes, noteTypeTitleById),
    [noteTypeTitleById, searchableNotes]
  )

  return useMemo(() => {
    return searchNotes(
      searchableNotes,
      searchQuery,
      noteTypeTitleById,
      searchIndex
    )
  }, [noteTypeTitleById, searchableNotes, searchIndex, searchQuery])
}
