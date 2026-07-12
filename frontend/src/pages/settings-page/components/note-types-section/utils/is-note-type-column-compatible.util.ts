import type { ColumnDto } from '../../../../../types/api'

export const isNoteTypeColumnCompatible = (
  sourceColumn: ColumnDto,
  targetColumn: ColumnDto
): boolean => {
  if (sourceColumn.type === targetColumn.type) {
    return true
  }

  const isTextLike = (type: ColumnDto['type']): boolean => {
    return type === 'text' || type === 'link'
  }

  return isTextLike(sourceColumn.type) && isTextLike(targetColumn.type)
}
