import type { LabelDto, NoteDto } from '../../../types/api'
import type { NoteSearchDocument } from '../types/note-search-document'
import { getLabelSearchText } from './get-label-search-text.util'
import { isLabelIdList } from './is-label-id-list.util'
import { normalizeNoteSearchValue } from './normalize-note-search-value.util'

export const createNoteSearchDocument = (
  note: NoteDto,
  noteTypeTitleById: Record<string, string>,
  labelById: ReadonlyMap<string, LabelDto>
): NoteSearchDocument => {
  const noteTypeTitle = noteTypeTitleById[note.noteTypeId] ?? ''

  return {
    createdAt: note.createdAt,
    id: note.id,
    noteTypeId: note.noteTypeId,
    noteTypeTitle,
    searchableText: [
      noteTypeTitle,
      getLabelSearchText(note, labelById),
      ...Object.values(note.values).map((value) =>
        isLabelIdList(value) ? '' : normalizeNoteSearchValue(value)
      ),
    ]
      .filter(Boolean)
      .join(' '),
    updatedAt: note.updatedAt,
  }
}
