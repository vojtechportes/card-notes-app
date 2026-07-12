import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NoteDto } from '../../../types/api'
import { useNotesSearch } from './use-notes-search'

const createNote = (id: string, noteTypeId: string, title: string): NoteDto => {
  return {
    createdAt: '2026-07-07T10:00:00.000Z',
    id,
    noteTypeId,
    updatedAt: '2026-07-07T10:00:00.000Z',
    values: { title },
  }
}

describe('useNotesSearch', () => {
  it('returns filtered notes for the provided search query', () => {
    const notes = [
      createNote('note-1', 'note-type-1', 'Alpha note'),
      createNote('note-2', 'note-type-2', 'Beta note'),
    ]

    const { result, rerender } = renderHook(
      ({ searchQuery }) =>
        useNotesSearch(notes, searchQuery, {
          'note-type-1': 'Books',
          'note-type-2': 'Movies',
        }),
      { initialProps: { searchQuery: 'alpha' } }
    )

    expect(result.current).toEqual([notes[0]])

    rerender({ searchQuery: '' })

    expect(result.current).toEqual(notes)
  })

  it('matches notes by note type title context', () => {
    const notes = [
      createNote('note-1', 'note-type-1', 'Alpha note'),
      createNote('note-2', 'note-type-2', 'Beta note'),
    ]

    const { result } = renderHook(() =>
      useNotesSearch(notes, 'movies', {
        'note-type-1': 'Books',
        'note-type-2': 'Movies',
      })
    )

    expect(result.current).toEqual([notes[1]])
  })

  it('handles notes that have not loaded yet', () => {
    const { result } = renderHook(() => useNotesSearch(undefined, 'alpha'))

    expect(result.current).toEqual([])
  })
})
