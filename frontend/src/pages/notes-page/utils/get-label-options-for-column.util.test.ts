import { describe, expect, it } from 'vitest'
import type { ColumnDto, LabelDto } from '../../../types/api'
import { getLabelOptionsForColumn } from './get-label-options-for-column.util'

const createLabel = (id: string, noteTypeId: string | null): LabelDto => ({
  color: '#0070F2',
  createdAt: '2026-07-21T10:00:00.000Z',
  id,
  name: id,
  noteTypeId,
  title: id,
  updatedAt: '2026-07-21T10:00:00.000Z',
})

const createColumn = (
  sources: { includeShared: boolean; noteTypeIds: string[] } | null
): ColumnDto => ({
  config: { allowMultiple: true, sources },
  createdAt: '2026-07-21T10:00:00.000Z',
  id: 'labels-column',
  isDefault: false,
  isHidden: false,
  name: 'labels',
  noteTypeId: 'note-type-1',
  sortOrder: 0,
  title: 'Labels',
  type: 'labels',
  updatedAt: '2026-07-21T10:00:00.000Z',
})

const labels = [
  createLabel('shared', null),
  createLabel('books', 'note-type-1'),
  createLabel('movies', 'note-type-2'),
]

describe('getLabelOptionsForColumn', () => {
  it('returns every label when sources are unrestricted', () => {
    expect(getLabelOptionsForColumn(createColumn(null), labels)).toEqual(labels)
  })

  it('filters shared and note-template sources', () => {
    expect(
      getLabelOptionsForColumn(
        createColumn({
          includeShared: true,
          noteTypeIds: ['note-type-1'],
        }),
        labels
      ).map((label) => label.id)
    ).toEqual(['shared', 'books'])
  })

  it('keeps an existing legacy selection after its source becomes disallowed', () => {
    expect(
      getLabelOptionsForColumn(
        createColumn({ includeShared: true, noteTypeIds: [] }),
        labels,
        ['movies']
      ).map((label) => label.id)
    ).toEqual(['shared', 'movies'])
  })
})
