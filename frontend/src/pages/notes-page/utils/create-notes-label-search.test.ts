import { describe, expect, it } from 'vitest'
import type { LabelDto, NoteDto } from '../../../types/api'
import { searchNotes } from './search-notes.util'

const notes: NoteDto[] = [
  {
    createdAt: '2026-07-21T10:00:00.000Z',
    id: 'assigned-note',
    noteTypeId: 'note-type-1',
    updatedAt: '2026-07-21T10:00:00.000Z',
    values: { labels: ['label-1', 'missing-label'] },
  },
  {
    createdAt: '2026-07-21T10:00:00.000Z',
    id: 'unassigned-note',
    noteTypeId: 'note-type-1',
    updatedAt: '2026-07-21T10:00:00.000Z',
    values: { title: 'Other note' },
  },
]

const labels: LabelDto[] = [
  {
    color: '#0070F2',
    createdAt: '2026-07-21T10:00:00.000Z',
    id: 'label-1',
    name: 'important-work',
    noteTypeId: null,
    title: 'Important',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
  {
    color: '#188918',
    createdAt: '2026-07-21T10:00:00.000Z',
    id: 'label-2',
    name: 'unassigned',
    noteTypeId: null,
    title: 'Unassigned',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
]

describe('label note search', () => {
  it('matches assigned label titles and names only', () => {
    expect(searchNotes(notes, 'important', {}, labels)).toEqual([notes[0]])
    expect(searchNotes(notes, 'important-work', {}, labels)).toEqual([notes[0]])
    expect(searchNotes(notes, 'unassigned', {}, labels)).toEqual([])
  })

  it('rebuilds against current metadata and ignores missing references', () => {
    const renamedLabels = [{ ...labels[0], name: 'urgent', title: 'Urgent' }]

    expect(searchNotes(notes, 'urgent', {}, renamedLabels)).toEqual([notes[0]])
    expect(searchNotes(notes, 'missing-label', {}, renamedLabels)).toEqual([])
  })
})
