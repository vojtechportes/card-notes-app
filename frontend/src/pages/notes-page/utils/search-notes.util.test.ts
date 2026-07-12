import { describe, expect, it } from 'vitest'
import type { NoteDto } from '../../../types/api'
import { normalizeNoteSearchValue } from './normalize-note-search-value.util'
import { searchNotes } from './search-notes.util'

const createNote = (
  id: string,
  values: NoteDto['values'],
  noteTypeId = 'bookscode1',
  timestamps?: Partial<Pick<NoteDto, 'createdAt' | 'updatedAt'>>
): NoteDto => {
  return {
    createdAt: timestamps?.createdAt ?? '2026-07-07T10:00:00.000Z',
    id,
    noteTypeId,
    updatedAt: timestamps?.updatedAt ?? '2026-07-07T10:00:00.000Z',
    values,
  }
}

describe('normalizeNoteSearchValue', () => {
  it('normalizes primitive and nested metadata values', () => {
    expect(
      normalizeNoteSearchValue({
        altText: 'Whiteboard sketch',
        fileName: 'planning-board.png',
        meta: { width: 1200 },
        mimeType: 'image/png',
        size: 2048,
      })
    ).toBe('Whiteboard sketch planning-board.png 1200 image/png 2048')
  })

  it('does not index data URLs', () => {
    expect(
      normalizeNoteSearchValue({
        dataUrl: 'data:image/png;base64,secretneedle',
        fileName: 'visible-file.png',
      })
    ).toBe('visible-file.png')
  })

  it('does not crash on nullish or circular unknown object values', () => {
    const circularValue: Record<string, unknown> = { title: 'Loop value' }
    circularValue.self = circularValue

    expect(normalizeNoteSearchValue(null)).toBe('')
    expect(normalizeNoteSearchValue(undefined)).toBe('')
    expect(normalizeNoteSearchValue(circularValue)).toBe('Loop value')
  })
})

describe('searchNotes', () => {
  it('returns all notes for an empty search query', () => {
    const notes = [createNote('note-1', { title: 'Alpha' })]

    expect(searchNotes(notes, '   ', { bookscode1: 'Books' })).toBe(notes)
  })

  it('searches text, date, number, image metadata, and link values', () => {
    const notes = [
      createNote('text-note', { body: 'Alpha project brief' }),
      createNote('date-note', { dueDate: '2031-05-10' }),
      createNote('number-note', { priority: 42 }),
      createNote('image-note', {
        image: {
          altText: 'Receipt from Prague',
          dataUrl: 'data:image/png;base64,hiddenneedle',
          fileName: 'receipt-prague.png',
          mimeType: 'image/png',
          size: 4096,
        },
      }),
      createNote('link-note', { source: 'https://example.com/roadmap' }),
    ]

    expect(searchNotes(notes, 'alpha', { bookscode1: 'Books' })).toEqual([
      notes[0],
    ])
    expect(searchNotes(notes, '2031', { bookscode1: 'Books' })).toEqual([
      notes[1],
    ])
    expect(searchNotes(notes, '42', { bookscode1: 'Books' })).toEqual([
      notes[2],
    ])
    expect(searchNotes(notes, 'receipt', { bookscode1: 'Books' })).toEqual([
      notes[3],
    ])
    expect(searchNotes(notes, 'roadmap', { bookscode1: 'Books' })).toEqual([
      notes[4],
    ])
  })

  it('searches by note type title and note type id context', () => {
    const notes = [
      createNote('note-1', { title: 'Alpha' }, 'bookscode1'),
      createNote('note-2', { title: 'Beta' }, 'moviecode2'),
    ]

    expect(
      searchNotes(notes, 'movies', {
        bookscode1: 'Books',
        moviecode2: 'Movies',
      })
    ).toEqual([notes[1]])
    expect(
      searchNotes(notes, 'bookscode1', {
        bookscode1: 'Books',
        moviecode2: 'Movies',
      })
    ).toEqual([notes[0]])
  })

  it('searches across dynamic note value keys', () => {
    const notes = [
      createNote('note-1', { customColumn: 'Zephyr signal' }),
      createNote('note-2', { anotherColumn: 'Quiet note' }),
    ]

    expect(searchNotes(notes, 'zephyr', { bookscode1: 'Books' })).toEqual([
      notes[0],
    ])
  })

  it('searches createdAt and updatedAt timestamps', () => {
    const notes = [
      createNote('created-note', { title: 'Timestamp note' }, 'bookscode1', {
        createdAt: '2040-01-01T10:00:00.000Z',
      }),
      createNote(
        'updated-note',
        { title: 'Another timestamp note' },
        'bookscode1',
        { updatedAt: '2041-02-02T10:00:00.000Z' }
      ),
    ]

    expect(searchNotes(notes, '2040', { bookscode1: 'Books' })).toEqual([
      notes[0],
    ])
    expect(searchNotes(notes, '2041', { bookscode1: 'Books' })).toEqual([
      notes[1],
    ])
  })

  it('does not search image data URL payloads', () => {
    const notes = [
      createNote('image-note', {
        image: {
          dataUrl: 'data:image/png;base64,hiddenneedle',
          fileName: 'visible-name.png',
        },
      }),
    ]

    expect(searchNotes(notes, 'hiddenneedle', { bookscode1: 'Books' })).toEqual(
      []
    )
    expect(searchNotes(notes, 'visible', { bookscode1: 'Books' })).toEqual(
      notes
    )
  })

  it('preserves fetched note order for matching results', () => {
    const notes = [
      createNote('note-2', { tag: 'shared match' }),
      createNote('note-1', { tag: 'shared match' }),
    ]

    expect(searchNotes(notes, 'shared', { bookscode1: 'Books' })).toEqual(notes)
  })
})
