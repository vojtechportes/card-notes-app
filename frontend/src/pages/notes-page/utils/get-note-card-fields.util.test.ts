import { describe, expect, it } from 'vitest'
import type { ColumnDto, NoteDto } from '../../../types/api'
import { getNoteCardFields } from './get-note-card-fields.util'

const createColumn = (overrides: Partial<ColumnDto>): ColumnDto => {
  return {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'column-id',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'column-name',
    sortOrder: 0,
    title: 'Column title',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
    ...overrides,
  }
}

const note: NoteDto = {
  createdAt: '2026-07-07T10:00:00.000Z',
  id: 'note-1',
  noteTypeId: 'note-type-1',
  updatedAt: '2026-07-07T12:00:00.000Z',
  values: {
    'image-column': {
      dataUrl: 'data:image/png;base64,abc',
      fileName: 'receipt.png',
    },
    'text-column': 'Alpha note',
  },
}

describe('getNoteCardFields', () => {
  it('uses visible columns in sort order and reads default timestamps from the note', () => {
    const fields = getNoteCardFields(
      note,
      [
        createColumn({
          id: 'updated-column',
          isDefault: true,
          name: 'updatedAt',
          sortOrder: 1,
          title: 'Updated at',
          type: 'date',
        }),
        createColumn({
          id: 'text-column',
          name: 'title',
          sortOrder: 2,
          title: 'Title',
        }),
        createColumn({
          id: 'created-column',
          isDefault: true,
          name: 'createdAt',
          sortOrder: 0,
          title: 'Created at',
          type: 'date',
        }),
      ],
      null,
      false,
      'Last updated at'
    )

    expect(fields).toEqual([
      {
        columnId: 'created-column',
        title: 'Created at',
        type: 'date',
        value: '2026-07-07T10:00:00.000Z',
      },
      {
        columnId: 'updated-column',
        title: 'Updated at',
        type: 'date',
        value: '2026-07-07T12:00:00.000Z',
      },
      {
        columnId: 'text-column',
        title: 'Title',
        type: 'text',
        value: 'Alpha note',
      },
    ])
  })

  it('merges createdAt and updatedAt into a single frontend field when enabled', () => {
    const fields = getNoteCardFields(
      note,
      [
        createColumn({
          id: 'created-column',
          isDefault: true,
          name: 'createdAt',
          sortOrder: 0,
          title: 'Created at',
          type: 'date',
        }),
        createColumn({
          id: 'updated-column',
          isDefault: true,
          name: 'updatedAt',
          sortOrder: 1,
          title: 'Updated at',
          type: 'date',
        }),
        createColumn({
          id: 'text-column',
          name: 'title',
          sortOrder: 2,
          title: 'Title',
        }),
      ],
      null,
      true,
      'Last updated at'
    )

    expect(fields).toEqual([
      {
        columnId: 'last-updated-at',
        title: 'Last updated at',
        type: 'date',
        value: '2026-07-07T12:00:00.000Z',
      },
      {
        columnId: 'text-column',
        title: 'Title',
        type: 'text',
        value: 'Alpha note',
      },
    ])
  })

  it('skips hidden or empty fields and applies the configured field count limit', () => {
    const fields = getNoteCardFields(
      {
        ...note,
        values: {
          'empty-column': '   ',
          'image-column': {
            fileName: 'receipt.png',
          },
          'text-column': 'Alpha note',
        },
      },
      [
        createColumn({
          id: 'hidden-column',
          isHidden: true,
          name: 'hidden',
          sortOrder: 0,
          title: 'Hidden',
        }),
        createColumn({
          id: 'empty-column',
          name: 'empty',
          sortOrder: 1,
          title: 'Empty',
        }),
        createColumn({
          id: 'text-column',
          name: 'title',
          sortOrder: 2,
          title: 'Title',
        }),
        createColumn({
          id: 'image-column',
          name: 'receipt',
          sortOrder: 3,
          title: 'Receipt',
          type: 'image',
        }),
      ],
      1,
      false,
      'Last updated at'
    )

    expect(fields).toEqual([
      {
        columnId: 'text-column',
        title: 'Title',
        type: 'text',
        value: 'Alpha note',
      },
    ])
  })
})
