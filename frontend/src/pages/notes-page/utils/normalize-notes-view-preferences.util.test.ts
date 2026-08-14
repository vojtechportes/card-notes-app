import { describe, expect, it } from 'vitest'
import { createDefaultNotesViewPreferences } from './create-default-notes-view-preferences.util'
import { normalizeNotesViewPreferences } from './normalize-notes-view-preferences.util'

const validPreferences = {
  version: 1,
  viewMode: 'data-grid',
  card: {
    labelIds: ['shared', 'shared', 'card-only'],
    labelMatchMode: 'and',
    noteTypeIds: ['books', 'books', 'movies'],
  },
  dataGrid: {
    labelIds: ['shared', 'grid-only', 'shared'],
    labelMatchMode: 'or',
    noteTypeId: 'books',
  },
  dataGridColumnWidths: {
    books: {
      author: 320,
      cover: 24,
      oversized: 5_000,
    },
    movies: {
      director: 270,
    },
  },
}

describe('normalizeNotesViewPreferences', () => {
  it('restores independent view filters and deduplicates IDs in first-seen order', () => {
    expect(normalizeNotesViewPreferences(validPreferences)).toEqual({
      ...validPreferences,
      card: {
        ...validPreferences.card,
        labelIds: ['shared', 'card-only'],
        noteTypeIds: ['books', 'movies'],
      },
      dataGrid: {
        ...validPreferences.dataGrid,
        labelIds: ['shared', 'grid-only'],
      },
    })
  })

  it('keeps widths isolated by note type and retains every finite positive width', () => {
    const normalized = normalizeNotesViewPreferences(validPreferences)

    expect(normalized?.dataGridColumnWidths).toEqual({
      books: {
        author: 320,
        cover: 24,
        oversized: 5_000,
      },
      movies: {
        director: 270,
      },
    })
  })

  it('removes invalid widths without discarding valid preferences', () => {
    const normalized = normalizeNotesViewPreferences({
      ...validPreferences,
      dataGridColumnWidths: {
        books: {
          valid: 180,
          zero: 0,
          negative: -1,
          notANumber: Number.NaN,
          infinite: Number.POSITIVE_INFINITY,
          missing: undefined,
        },
      },
    })

    expect(normalized?.dataGridColumnWidths).toEqual({
      books: { valid: 180 },
    })
  })

  it.each([
    null,
    [],
    { ...validPreferences, version: 2 },
    { ...validPreferences, viewMode: 'table' },
    { ...validPreferences, card: null },
    {
      ...validPreferences,
      card: { ...validPreferences.card, noteTypeIds: ['books', 42] },
    },
    {
      ...validPreferences,
      dataGrid: { ...validPreferences.dataGrid, noteTypeId: '' },
    },
    {
      ...validPreferences,
      dataGrid: { ...validPreferences.dataGrid, labelMatchMode: 'some' },
    },
    { ...validPreferences, dataGridColumnWidths: [] },
    {
      ...validPreferences,
      dataGridColumnWidths: { books: 'invalid' },
    },
  ])('rejects malformed or unsupported payload %#', (payload) => {
    expect(normalizeNotesViewPreferences(payload)).toBeNull()
  })
})

describe('createDefaultNotesViewPreferences', () => {
  it('creates a fresh card-view default each time', () => {
    const first = createDefaultNotesViewPreferences()
    first.card.noteTypeIds.push('books')
    first.dataGridColumnWidths.books = { author: 200 }

    expect(createDefaultNotesViewPreferences()).toEqual({
      version: 1,
      viewMode: 'card',
      card: {
        labelIds: [],
        labelMatchMode: 'or',
        noteTypeIds: [],
      },
      dataGrid: {
        labelIds: [],
        labelMatchMode: 'or',
        noteTypeId: null,
      },
      dataGridColumnWidths: {},
    })
  })
})
