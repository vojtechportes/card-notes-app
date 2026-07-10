import { describe, expect, it } from 'vitest'
import type { ColumnDto } from '../../../../../types/api'
import { getReorderedColumnIds } from './get-reordered-column-ids.util'

const columns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'created-at',
    isDefault: true,
    isHidden: false,
    name: 'createdAt',
    sortOrder: 0,
    title: 'Created at',
    type: 'date',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'summary',
    isDefault: false,
    isHidden: false,
    name: 'summary',
    sortOrder: 1,
    title: 'Summary',
    type: 'text',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'reference-link',
    isDefault: false,
    isHidden: false,
    name: 'referenceLink',
    sortOrder: 2,
    title: 'Reference link',
    type: 'link',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
]

describe('getReorderedColumnIds', () => {
  it('returns the full reordered id list', () => {
    expect(getReorderedColumnIds(columns, 'reference-link', 'summary')).toEqual(
      ['created-at', 'reference-link', 'summary']
    )
  })

  it('returns null when the drag target is invalid or unchanged', () => {
    expect(getReorderedColumnIds(columns, 'summary', 'summary')).toBeNull()
    expect(getReorderedColumnIds(columns, 'missing', 'summary')).toBeNull()
    expect(getReorderedColumnIds(columns, 'summary', 'missing')).toBeNull()
  })
})
