import type { ColumnDto } from '../../../../../types/api'
import { NOTE_DATA_GRID_COLUMN_WIDTHS } from '../constants/note-data-grid.constants'

export const getNoteDataGridDefaultColumnWidth = (
  column: Pick<ColumnDto, 'type'>
): number => {
  return NOTE_DATA_GRID_COLUMN_WIDTHS[column.type]
}
