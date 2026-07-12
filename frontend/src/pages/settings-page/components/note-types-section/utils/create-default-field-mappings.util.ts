import type { ColumnDto } from '../../../../../types/api'
import { getCompatibleTargetColumns } from './get-compatible-target-columns.util'

export const createDefaultFieldMappings = (
  sourceColumns: ColumnDto[],
  targetColumns: ColumnDto[]
): Record<string, string> => {
  return sourceColumns.reduce<Record<string, string>>((mappings, sourceColumn) => {
    const matchingTargetColumn = getCompatibleTargetColumns(
      sourceColumn,
      targetColumns
    ).find((targetColumn) => targetColumn.name === sourceColumn.name)

    mappings[sourceColumn.id] = matchingTargetColumn?.id ?? ''

    return mappings
  }, {})
}
