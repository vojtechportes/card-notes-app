import { describe, expect, it } from 'vitest'
import type { ColumnDto } from '../../../../../types/api'
import {
  NOTE_DATA_GRID_MAX_COLUMN_WIDTH,
  NOTE_DATA_GRID_MIN_COLUMN_WIDTH,
} from '../constants/note-data-grid.constants'
import { resolveNoteDataGridColumnWidth } from './resolve-note-data-grid-column-width.util'

const column = (type: ColumnDto['type']): Pick<ColumnDto, 'type'> => ({ type })

describe('resolveNoteDataGridColumnWidth', () => {
  it.each([
    ['text', 270],
    ['link', 270],
    ['image', 104],
    ['number', 90],
    ['date', 90],
    ['labels', 140],
  ] as const)(
    'uses the %s type default when no valid width exists',
    (type, expected) => {
      expect(resolveNoteDataGridColumnWidth(column(type), undefined)).toBe(
        expected
      )
      expect(resolveNoteDataGridColumnWidth(column(type), Number.NaN)).toBe(
        expected
      )
      expect(
        resolveNoteDataGridColumnWidth(column(type), Number.POSITIVE_INFINITY)
      ).toBe(expected)
      expect(resolveNoteDataGridColumnWidth(column(type), 0)).toBe(expected)
      expect(resolveNoteDataGridColumnWidth(column(type), -10)).toBe(expected)
    }
  )

  it('keeps a stable-column persisted width across type changes', () => {
    expect(resolveNoteDataGridColumnWidth(column('number'), 360)).toBe(360)
  })
  it('clamps finite positive persisted widths to the Notes-owned bounds', () => {
    expect(resolveNoteDataGridColumnWidth(column('text'), 12)).toBe(
      NOTE_DATA_GRID_MIN_COLUMN_WIDTH
    )
    expect(resolveNoteDataGridColumnWidth(column('text'), 320)).toBe(320)
    expect(resolveNoteDataGridColumnWidth(column('text'), 1000)).toBe(
      NOTE_DATA_GRID_MAX_COLUMN_WIDTH
    )
  })
})
