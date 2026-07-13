import { ColumnTypeEnum } from '../types/column-type-enum'
import type { NoteColumn } from '../types/note-column'

export const isMultiImageColumn = (
  column: Pick<NoteColumn, 'config' | 'type'>
): boolean => {
  if (column.type !== ColumnTypeEnum.Image) {
    return false
  }

  return column.config?.isMultiImage === true
}
