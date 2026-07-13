import type { ColumnDto } from '../types/api'

export const isMultiImageColumn = (
  column: Pick<ColumnDto, 'config' | 'type'>
): boolean => {
  if (column.type !== 'image') {
    return false
  }

  return column.config?.isMultiImage === true
}
