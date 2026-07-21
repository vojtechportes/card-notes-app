import { describe, expect, it } from 'vitest'
import type { Label } from '../../../../src/modules/settings/types/label'
import { filterLabelIdsForColumn } from '../../../../src/modules/settings/utils/filter-label-ids-for-column.util'

const labels: Label[] = [
  {
    id: 'shared',
    title: 'Shared',
    name: 'shared',
    color: '#0070F2',
    noteTypeId: null,
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
  {
    id: 'books',
    title: 'Books',
    name: 'books',
    color: '#188918',
    noteTypeId: 'books-type',
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
  {
    id: 'movies',
    title: 'Movies',
    name: 'movies',
    color: '#C35500',
    noteTypeId: 'movies-type',
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
]

describe(filterLabelIdsForColumn.name, () => {
  it('keeps unique allowed ids in order and removes unknown or disallowed ids', () => {
    expect(
      filterLabelIdsForColumn(
        ['movies', 'shared', 'books', 'shared', 'missing'],
        {
          allowMultiple: true,
          sources: { includeShared: true, noteTypeIds: ['books-type'] },
        },
        labels
      )
    ).toEqual(['shared', 'books'])
  })

  it('allows every existing source when sources are null', () => {
    expect(
      filterLabelIdsForColumn(
        ['movies', 'shared', 'books'],
        { allowMultiple: true, sources: null },
        labels
      )
    ).toEqual(['movies', 'shared', 'books'])
  })

  it('keeps only the first allowed id for a single-select target', () => {
    expect(
      filterLabelIdsForColumn(
        ['movies', 'books', 'shared'],
        {
          allowMultiple: false,
          sources: { includeShared: true, noteTypeIds: ['books-type'] },
        },
        labels
      )
    ).toEqual(['books'])
  })

  it('returns an empty array for malformed values', () => {
    expect(
      filterLabelIdsForColumn(
        'shared',
        { allowMultiple: true, sources: null },
        labels
      )
    ).toEqual([])
    expect(
      filterLabelIdsForColumn(
        [1, { id: 'shared' }] as never,
        { allowMultiple: true, sources: null },
        labels
      )
    ).toEqual([])
  })
})
