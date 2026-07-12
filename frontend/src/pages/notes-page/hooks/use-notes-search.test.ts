import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NoteDto } from '../../../types/api'
import { useNotesSearch } from './use-notes-search'

const createNote = (id: string, title: string): NoteDto => {
  return {
    createdAt: '2026-07-07T10:00:00.000Z',
    id,
    noteTypeId: 'note-type-1',
    updatedAt: '2026-07-07T10:00:00.000Z',
    values: { title },
  }
}

describe('useNotesSearch', () => {
  it('returns filtered notes for the provided search query', () => {
    const notes = [
      createNote('note-1', 'Alpha note'),
      createNote('note-2', 'Beta note'),
    ]

    const { result, rerender } = renderHook(
      ({ searchQuery }) => useNotesSearch(notes, searchQuery),
      { initialProps: { searchQuery: 'alpha' } }
    )

    expect(result.current).toEqual([notes[0]])

    rerender({ searchQuery: '' })

    expect(result.current).toEqual(notes)
  })

  it('handles notes that have not loaded yet', () => {
    const { result } = renderHook(() => useNotesSearch(undefined, 'alpha'))

    expect(result.current).toEqual([])
  })
})
