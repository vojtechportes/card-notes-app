import type { ColumnDto } from '../../../../../types/api'

export const filterEditableNoteColumns = (
  columns: ColumnDto[]
): ColumnDto[] => {
  return [...columns]
    .filter((column) => {
      const isSystemTimestampColumn =
        column.isDefault &&
        (column.name === 'createdAt' || column.name === 'updatedAt')

      return !column.isHidden && !isSystemTimestampColumn
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
}
