import { describe, expect, it, vi } from 'vitest'
import { NOTES_VIEW_PREFERENCES_STORAGE_KEY } from '../constants/notes-view-preferences.constants'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import { readNotesViewPreferences } from './read-notes-view-preferences.util'
import { writeNotesViewPreferences } from './write-notes-view-preferences.util'

const preferences: NotesViewPreferences = {
  version: 1,
  viewMode: 'data-grid',
  card: {
    labelIds: ['card-label'],
    labelMatchMode: 'and',
    noteTypeIds: ['books', 'movies'],
  },
  dataGrid: {
    labelIds: ['grid-label'],
    labelMatchMode: 'or',
    noteTypeId: 'books',
  },
  dataGridColumnWidths: {
    books: { author: 320 },
  },
}

const createStorage = (storedValue: string | null = null): Storage => {
  const values = new Map<string, string>()

  if (storedValue !== null) {
    values.set(NOTES_VIEW_PREFERENCES_STORAGE_KEY, storedValue)
  }

  return {
    get length() {
      return values.size
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  }
}

const expectedDefaultPreferences: NotesViewPreferences = {
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
}

describe('readNotesViewPreferences', () => {
  it('restores a valid stored preference payload', () => {
    const storage = createStorage(JSON.stringify(preferences))

    expect(readNotesViewPreferences(storage)).toEqual(preferences)
  })

  it.each([
    null,
    '{broken json',
    JSON.stringify({ ...preferences, version: 2 }),
  ])(
    'returns card defaults for missing, malformed, or unsupported storage: %s',
    (storedValue) => {
      expect(readNotesViewPreferences(createStorage(storedValue))).toEqual(
        expectedDefaultPreferences
      )
    }
  )

  it('does not throw when storage access fails', () => {
    const storage = createStorage()
    vi.mocked(storage.getItem).mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    expect(() => readNotesViewPreferences(storage)).not.toThrow()
    expect(readNotesViewPreferences(storage)).toEqual(
      expectedDefaultPreferences
    )
  })

  it('does not share mutable defaults between reads', () => {
    const first = readNotesViewPreferences(createStorage())
    first.card.labelIds.push('mutated')

    expect(readNotesViewPreferences(createStorage())).toEqual(
      expectedDefaultPreferences
    )
  })
})

describe('writeNotesViewPreferences', () => {
  it('stores a normalized, versioned payload', () => {
    const storage = createStorage()
    const payloadWithDuplicates = {
      ...preferences,
      card: {
        ...preferences.card,
        labelIds: ['card-label', 'card-label'],
      },
      dataGridColumnWidths: {
        books: {
          author: 320,
          invalid: 0,
        },
      },
    }

    writeNotesViewPreferences(payloadWithDuplicates, storage)

    expect(storage.setItem).toHaveBeenCalledWith(
      NOTES_VIEW_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        ...payloadWithDuplicates,
        card: {
          ...payloadWithDuplicates.card,
          labelIds: ['card-label'],
        },
        dataGridColumnWidths: {
          books: { author: 320 },
        },
      })
    )
  })

  it('does not throw when storage persistence fails', () => {
    const storage = createStorage()
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    expect(() => writeNotesViewPreferences(preferences, storage)).not.toThrow()
  })
})
