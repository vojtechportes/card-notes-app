import type { ColumnDto } from '../../../../../types/api'
import { isNoteTypeColumnCompatible } from './is-note-type-column-compatible.util'

export const getCompatibleTargetColumns = (
  sourceColumn: ColumnDto,
  targetColumns: ColumnDto[]
): ColumnDto[] => {
  return targetColumns.filter((targetColumn) => {
    return isNoteTypeColumnCompatible(sourceColumn, targetColumn)
  })
}
