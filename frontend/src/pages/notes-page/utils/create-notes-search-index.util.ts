import MiniSearch from 'minisearch'
import type { LabelDto, NoteDto } from '../../../types/api'
import { NOTE_SEARCH_FIELDS } from '../constants/note-search.constants'
import type { NoteSearchDocument } from '../types/note-search-document'
import { createNoteSearchDocument } from './create-note-search-document.util'

export const createNotesSearchIndex = (
  notes: NoteDto[],
  noteTypeTitleById: Record<string, string>,
  labels: LabelDto[] = []
): MiniSearch<NoteSearchDocument> => {
  const searchIndex = new MiniSearch<NoteSearchDocument>({
    fields: NOTE_SEARCH_FIELDS,
    idField: 'id',
    searchOptions: {
      prefix: true,
    },
  })

  const labelById = new Map(labels.map((label) => [label.id, label]))

  searchIndex.addAll(
    notes.map((note) =>
      createNoteSearchDocument(note, noteTypeTitleById, labelById)
    )
  )

  return searchIndex
}
