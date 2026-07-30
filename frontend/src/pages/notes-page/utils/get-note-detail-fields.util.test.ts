import { describe, expect, it } from 'vitest'
import type { ColumnDto, NoteDto } from '../../../types/api'
import { getNoteDetailFields } from './get-note-detail-fields.util'

const createColumn = (overrides: Partial<ColumnDto>): ColumnDto => ({
  config: null,
  createdAt: '2026-07-07T10:00:00.000Z',
  id: 'column-id',
  isDefault: false,
  isHidden: false,
  isHiddenInDetail: false,
  name: 'column-name',
  noteTypeId: 'note-type-1',
  sortOrder: 0,
  title: 'Column title',
  type: 'text',
  updatedAt: '2026-07-07T10:00:00.000Z',
  ...overrides,
})

const note: NoteDto = {
  background: null,
  createdAt: '2026-07-07T10:00:00.000Z',
  id: 'note-1',
  noteTypeId: 'note-type-1',
  updatedAt: '2026-07-07T12:00:00.000Z',
  values: {
    'detail-hidden': 'Hidden detail value',
    'list-hidden': 'Visible detail value',
  },
}

describe('getNoteDetailFields', () => {
  it('filters by detail visibility without applying list visibility', () => {
    const fields = getNoteDetailFields(
      note,
      [
        createColumn({
          id: 'list-hidden',
          isHidden: true,
          title: 'List hidden',
        }),
        createColumn({
          id: 'detail-hidden',
          isHiddenInDetail: true,
          sortOrder: 1,
          title: 'Detail hidden',
        }),
      ],
      false,
      'Last updated at'
    )

    expect(fields.map((field) => field.title)).toEqual(['List hidden'])
  })
})
