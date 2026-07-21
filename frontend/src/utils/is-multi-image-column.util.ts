import type { ColumnDto } from '../types/api'

export const isMultiImageColumn = (
  column: Pick<ColumnDto, 'config' | 'type'>
): boolean => {
  if (column.type !== 'image') {
    return false
  }

  return (
    column.config !== undefined &&
    column.config !== null &&
    'isMultiImage' in column.config &&
    column.config.isMultiImage === true
  )
}
