import type { ColumnDto } from '../../../../../types/api'

export const getVisibleNoteDataGridColumns = (
  columns: ColumnDto[]
): ColumnDto[] => {
  return columns
    .filter((column) => !column.isHidden)
    .sort(
      (leftColumn, rightColumn) => leftColumn.sortOrder - rightColumn.sortOrder
    )
}
