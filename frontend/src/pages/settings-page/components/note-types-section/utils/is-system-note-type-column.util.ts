import type { ColumnDto } from '../../../../../types/api'

export const isSystemNoteTypeColumn = (column: ColumnDto): boolean => {
  return (
    column.isDefault &&
    (column.name === 'createdAt' || column.name === 'updatedAt')
  )
}
