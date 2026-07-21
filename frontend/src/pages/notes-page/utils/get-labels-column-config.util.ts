import type {
  ColumnDto,
  LabelsColumnConfigDto,
  LabelsColumnSourcesDto,
} from '../../../types/api'

export const getLabelsColumnConfig = (
  column: ColumnDto
): LabelsColumnConfigDto | undefined => {
  if (
    column.type !== 'labels' ||
    !column.config ||
    typeof column.config !== 'object' ||
    typeof column.config.allowMultiple !== 'boolean'
  ) {
    return undefined
  }

  const sources = column.config.sources

  if (sources === null) {
    return {
      allowMultiple: column.config.allowMultiple,
      sources: null,
    }
  }

  if (!sources || typeof sources !== 'object') {
    return undefined
  }

  const sourceRecord = sources as Partial<LabelsColumnSourcesDto>

  if (
    typeof sourceRecord.includeShared !== 'boolean' ||
    !Array.isArray(sourceRecord.noteTypeIds) ||
    !sourceRecord.noteTypeIds.every(
      (noteTypeId) => typeof noteTypeId === 'string'
    )
  ) {
    return undefined
  }

  return {
    allowMultiple: column.config.allowMultiple,
    sources: {
      includeShared: sourceRecord.includeShared,
      noteTypeIds: sourceRecord.noteTypeIds,
    },
  }
}
