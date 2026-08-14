import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ColumnDto, LabelDto, NoteTypeDto } from '../../../types/api'
import { NOTES_VIEW_PREFERENCES_STORAGE_KEY } from '../constants/notes-view-preferences.constants'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import type { UseNotesViewPreferencesOptions } from '../types/use-notes-view-preferences-options'
import { useNotesViewPreferences } from './use-notes-view-preferences'

const storedPreferences: NotesViewPreferences = {
  version: 1,
  viewMode: 'data-grid',
  card: {
    labelIds: ['shared', 'deleted-label'],
    labelMatchMode: 'and',
    noteTypeIds: ['books', 'deleted-template'],
  },
  dataGrid: {
    labelIds: ['shared', 'books-label', 'movies-label'],
    labelMatchMode: 'or',
    noteTypeId: 'books',
  },
  dataGridColumnWidths: {
    books: { title: 270, removed: 180 },
    deleted: { old: 200 },
  },
}

const noteTypes = [
  { id: 'books', title: 'Books' },
  { id: 'movies', title: 'Movies' },
] as NoteTypeDto[]

const labels = [
  { id: 'shared', noteTypeId: null, title: 'Shared' },
  { id: 'books-label', noteTypeId: 'books', title: 'Books label' },
  { id: 'movies-label', noteTypeId: 'movies', title: 'Movies label' },
] as LabelDto[]

const columnsByNoteTypeId = {
  books: [{ id: 'title', isHidden: true, noteTypeId: 'books' } as ColumnDto],
  movies: [],
}

const createStorage = (): Storage => {
  const values = new Map([
    [NOTES_VIEW_PREFERENCES_STORAGE_KEY, JSON.stringify(storedPreferences)],
  ])

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

const createOptions = (storage: Storage): UseNotesViewPreferencesOptions => ({
  areColumnsReady: false,
  areLabelsReady: false,
  areNoteTypesReady: false,
  columnsByNoteTypeId: {},
  labels: [],
  noteTypes: [],
  storage,
})

describe('useNotesViewPreferences', () => {
  it('does not reconcile or persist filters while option queries load or fail', () => {
    const storage = createStorage()
    const { result, rerender } = renderHook(
      (options: UseNotesViewPreferencesOptions) =>
        useNotesViewPreferences(options),
      { initialProps: createOptions(storage) }
    )

    expect(result.current.preferences).toEqual(storedPreferences)
    expect(storage.setItem).not.toHaveBeenCalled()

    rerender({
      ...createOptions(storage),
      areNoteTypesReady: true,
      noteTypes,
    })

    expect(result.current.preferences).toEqual(storedPreferences)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('persists reconciled filters and widths after their queries succeed', async () => {
    const storage = createStorage()
    const { result } = renderHook(() =>
      useNotesViewPreferences({
        areColumnsReady: true,
        areLabelsReady: true,
        areNoteTypesReady: true,
        columnsByNoteTypeId,
        labels,
        noteTypes,
        storage,
      })
    )

    await waitFor(() => {
      expect(result.current.preferences).toEqual({
        ...storedPreferences,
        card: {
          ...storedPreferences.card,
          labelIds: ['shared'],
          noteTypeIds: ['books'],
        },
        dataGrid: {
          ...storedPreferences.dataGrid,
          labelIds: ['shared', 'books-label'],
        },
        dataGridColumnWidths: {
          books: { title: 270 },
        },
      })
    })

    await waitFor(() => {
      expect(storage.setItem).toHaveBeenLastCalledWith(
        NOTES_VIEW_PREFERENCES_STORAGE_KEY,
        JSON.stringify(result.current.preferences)
      )
    })
  })

  it('falls back to the first template, prunes labels on template change, and preserves grid scope when cleared', async () => {
    const storage = createStorage()
    vi.mocked(storage.getItem).mockReturnValue(
      JSON.stringify({
        ...storedPreferences,
        dataGrid: {
          ...storedPreferences.dataGrid,
          noteTypeId: 'deleted-template',
        },
      })
    )
    const { result } = renderHook(() =>
      useNotesViewPreferences({
        areColumnsReady: false,
        areLabelsReady: true,
        areNoteTypesReady: true,
        columnsByNoteTypeId: {},
        labels,
        noteTypes,
        storage,
      })
    )

    await waitFor(() => {
      expect(result.current.preferences.dataGrid.noteTypeId).toBe('books')
    })

    act(() => {
      result.current.setDataGridNoteTypeId('movies')
    })

    expect(result.current.preferences.dataGrid).toMatchObject({
      labelIds: ['shared'],
      noteTypeId: 'movies',
    })

    act(() => {
      result.current.setDataGridLabelIds(['shared', 'movies-label'])
      result.current.clearFilters('data-grid')
    })

    expect(result.current.preferences.dataGrid).toMatchObject({
      labelIds: [],
      noteTypeId: 'movies',
    })
  })

  it('clears both card filter dimensions without changing grid preferences', async () => {
    const storage = createStorage()
    const { result } = renderHook(() =>
      useNotesViewPreferences({
        areColumnsReady: false,
        areLabelsReady: true,
        areNoteTypesReady: true,
        columnsByNoteTypeId: {},
        labels,
        noteTypes,
        storage,
      })
    )

    await waitFor(() => {
      expect(result.current.areFiltersReconciled).toBe(true)
    })

    const dataGridPreferences = result.current.preferences.dataGrid

    act(() => {
      result.current.clearFilters('card')
    })

    expect(result.current.preferences.card).toMatchObject({
      labelIds: [],
      noteTypeIds: [],
    })
    expect(result.current.preferences.dataGrid).toEqual(dataGridPreferences)
  })
})
