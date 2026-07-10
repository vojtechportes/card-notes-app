import { useMemo } from 'react'
import type { NoteDto } from '../../../types/api'
import { createNotesSearchIndex } from '../utils/create-notes-search-index.util'
import { searchNotes } from '../utils/search-notes.util'

const EMPTY_NOTES: NoteDto[] = []

export const useNotesSearch = (
  notes: NoteDto[] | undefined,
  searchQuery: string
): NoteDto[] => {
  const searchableNotes = notes ?? EMPTY_NOTES
  const searchIndex = useMemo(
    () => createNotesSearchIndex(searchableNotes),
    [searchableNotes]
  )

  return useMemo(() => {
    return searchNotes(searchableNotes, searchQuery, searchIndex)
  }, [searchableNotes, searchIndex, searchQuery])
}
