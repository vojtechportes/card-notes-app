import { describe, expect, it } from 'vitest'
import type { ColumnDto } from '../../../../../types/api'
import { getVisibleNoteDataGridColumns } from './get-visible-note-data-grid-columns.util'

const createColumn = (
  id: string,
  sortOrder: number,
  isHidden = false
): ColumnDto => ({
  config: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  id,
  isDefault: false,
  isHidden,
  isHiddenInDetail: false,
  name: id,
  noteTypeId: 'books',
  sortOrder,
  title: id,
  type: 'text',
  updatedAt: '2026-08-14T10:00:00.000Z',
})

describe('getVisibleNoteDataGridColumns', () => {
  it('sorts visible columns and omits list-hidden fields without mutating input', () => {
    const columns = [
      createColumn('third', 3),
      createColumn('hidden', 1, true),
      createColumn('second', 2),
    ]

    expect(getVisibleNoteDataGridColumns(columns).map(({ id }) => id)).toEqual([
      'second',
      'third',
    ])
    expect(columns.map(({ id }) => id)).toEqual(['third', 'hidden', 'second'])
  })
})
