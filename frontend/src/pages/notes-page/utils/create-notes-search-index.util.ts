import MiniSearch from 'minisearch'
import type { NoteDto } from '../../../types/api'
import { NOTE_SEARCH_FIELDS } from '../constants/note-search.constants'
import type { NoteSearchDocument } from '../types/note-search-document'
import { createNoteSearchDocument } from './create-note-search-document.util'

export const createNotesSearchIndex = (
  notes: NoteDto[]
): MiniSearch<NoteSearchDocument> => {
  const searchIndex = new MiniSearch<NoteSearchDocument>({
    fields: NOTE_SEARCH_FIELDS,
    idField: 'id',
    searchOptions: {
      prefix: true,
    },
  })

  searchIndex.addAll(notes.map((note) => createNoteSearchDocument(note)))

  return searchIndex
}
