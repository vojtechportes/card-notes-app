import type { ColumnDto } from '../../../../../types/api'
import {
  NOTE_DATA_GRID_MAX_COLUMN_WIDTH,
  NOTE_DATA_GRID_MIN_COLUMN_WIDTH,
} from '../constants/note-data-grid.constants'
import { getNoteDataGridDefaultColumnWidth } from './get-note-data-grid-default-column-width.util'

export const resolveNoteDataGridColumnWidth = (
  column: Pick<ColumnDto, 'type'>,
  persistedWidth: number | undefined
): number => {
  if (
    typeof persistedWidth !== 'number' ||
    !Number.isFinite(persistedWidth) ||
    persistedWidth <= 0
  ) {
    return getNoteDataGridDefaultColumnWidth(column)
  }

  return Math.min(
    NOTE_DATA_GRID_MAX_COLUMN_WIDTH,
    Math.max(NOTE_DATA_GRID_MIN_COLUMN_WIDTH, persistedWidth)
  )
}
