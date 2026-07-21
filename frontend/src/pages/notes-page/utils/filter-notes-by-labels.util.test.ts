import type { ColumnDto, NoteDto } from '../../../types/api'
import { describe, expect, it } from 'vitest'
import { filterNotesByLabels } from './filter-notes-by-labels.util'

const labelColumn = (id: string, noteTypeId: string): ColumnDto => ({
  config: null,
  createdAt: '2026-07-21T10:00:00.000Z',
  id,
  isDefault: false,
  isHidden: false,
  name: id,
  noteTypeId,
  sortOrder: 0,
  title: id,
  type: 'labels',
  updatedAt: '2026-07-21T10:00:00.000Z',
})

const textColumn = (id: string, noteTypeId: string): ColumnDto => ({
  ...labelColumn(id, noteTypeId),
  type: 'text',
})

const note = (
  id: string,
  noteTypeId: string,
  values: NoteDto['values']
): NoteDto => ({
  createdAt: '2026-07-21T10:00:00.000Z',
  id,
  noteTypeId,
  updatedAt: '2026-07-21T10:00:00.000Z',
  values,
})

const columnsByNoteType = {
  books: [
    labelColumn('genres', 'books'),
    labelColumn('audiences', 'books'),
    textColumn('keywords', 'books'),
  ],
}

const notes = [
  note('note-1', 'books', {
    audiences: ['label-adult'],
    genres: ['label-fiction', 'label-mystery'],
    keywords: ['label-ignored'],
  }),
  note('note-2', 'books', { genres: ['label-fiction'] }),
  note('note-3', 'books', { genres: 'malformed' }),
]

describe('filterNotesByLabels', () => {
  it('returns all notes when no labels are selected', () => {
    expect(filterNotesByLabels(notes, columnsByNoteType, [], 'and')).toEqual(
      notes
    )
  })

  it('matches any selected label in OR mode and preserves note order', () => {
    expect(
      filterNotesByLabels(
        notes,
        columnsByNoteType,
        ['label-adult', 'label-missing'],
        'or'
      ).map(({ id }) => id)
    ).toEqual(['note-1'])
  })

  it('requires all selected labels across label fields in AND mode', () => {
    expect(
      filterNotesByLabels(
        notes,
        columnsByNoteType,
        ['label-fiction', 'label-adult'],
        'and'
      ).map(({ id }) => id)
    ).toEqual(['note-1'])
  })

  it('ignores string arrays from non-label fields and malformed values', () => {
    expect(
      filterNotesByLabels(notes, columnsByNoteType, ['label-ignored'], 'or')
    ).toEqual([])
  })

  it('handles duplicate selections and missing column metadata defensively', () => {
    expect(
      filterNotesByLabels(
        notes,
        columnsByNoteType,
        ['label-fiction', 'label-fiction'],
        'and'
      ).map(({ id }) => id)
    ).toEqual(['note-1', 'note-2'])
    expect(filterNotesByLabels(notes, {}, ['label-fiction'], 'or')).toEqual([])
  })
})
