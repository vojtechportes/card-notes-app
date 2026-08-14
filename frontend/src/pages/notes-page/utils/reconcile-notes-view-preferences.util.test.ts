import { describe, expect, it } from 'vitest'
import type { ColumnDto, LabelDto, NoteTypeDto } from '../../../types/api'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import { reconcileNotesDataGridColumnWidths } from './reconcile-notes-data-grid-column-widths.util'
import { reconcileNotesViewFilters } from './reconcile-notes-view-filters.util'

const noteTypes = [
  { id: 'books', title: 'Books' },
  { id: 'movies', title: 'Movies' },
] as NoteTypeDto[]

const labels = [
  { id: 'shared', noteTypeId: null, title: 'Shared' },
  { id: 'books-label', noteTypeId: 'books', title: 'Books' },
  { id: 'movies-label', noteTypeId: 'movies', title: 'Movies' },
] as LabelDto[]

const preferences: NotesViewPreferences = {
  version: 1,
  viewMode: 'data-grid',
  card: {
    labelIds: ['missing-label', 'shared'],
    labelMatchMode: 'and',
    noteTypeIds: ['missing-template', 'movies'],
  },
  dataGrid: {
    labelIds: ['shared', 'books-label', 'movies-label'],
    labelMatchMode: 'or',
    noteTypeId: 'books',
  },
  dataGridColumnWidths: {
    books: { hidden: 140, removed: 200 },
    deleted: { old: 300 },
  },
}

describe('reconcileNotesViewFilters', () => {
  it('intersects card filters and scopes data-grid labels to the restored template', () => {
    expect(reconcileNotesViewFilters(preferences, noteTypes, labels)).toEqual({
      ...preferences,
      card: {
        labelIds: ['shared'],
        labelMatchMode: 'and',
        noteTypeIds: ['movies'],
      },
      dataGrid: {
        labelIds: ['shared', 'books-label'],
        labelMatchMode: 'or',
        noteTypeId: 'books',
      },
    })
  })

  it('uses the first template in API order when the stored template is stale', () => {
    const reconciled = reconcileNotesViewFilters(
      {
        ...preferences,
        dataGrid: {
          ...preferences.dataGrid,
          noteTypeId: 'deleted',
        },
      },
      noteTypes,
      labels
    )

    expect(reconciled.dataGrid.noteTypeId).toBe('books')
    expect(reconciled.dataGrid.labelIds).toEqual(['shared', 'books-label'])
  })

  it('retains no data-grid template and only shared labels when none exist', () => {
    const reconciled = reconcileNotesViewFilters(preferences, [], labels)

    expect(reconciled.dataGrid.noteTypeId).toBeNull()
    expect(reconciled.dataGrid.labelIds).toEqual(['shared'])
  })
})

describe('reconcileNotesDataGridColumnWidths', () => {
  it('removes deleted templates and columns while retaining hidden defined columns', () => {
    const hiddenColumn = {
      id: 'hidden',
      isHidden: true,
      noteTypeId: 'books',
    } as ColumnDto

    expect(
      reconcileNotesDataGridColumnWidths(
        preferences.dataGridColumnWidths,
        noteTypes,
        {
          books: [hiddenColumn],
          movies: [],
        }
      )
    ).toEqual({
      books: { hidden: 140 },
    })
  })
})
