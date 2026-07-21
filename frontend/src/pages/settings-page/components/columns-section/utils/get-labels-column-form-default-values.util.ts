import type { ColumnDto, LabelsColumnConfigDto } from '../../../../../types/api'
import { sharedLabelSourceValue } from '../constants/shared-label-source-value'
import type { ColumnFormValues } from '../types/column-form-values'

export const getLabelsColumnFormDefaultValues = (
  column?: ColumnDto
): Pick<ColumnFormValues, 'allowMultipleLabels' | 'labelSourceIds'> => {
  if (column?.type !== 'labels' || !column.config) {
    return {
      allowMultipleLabels: false,
      labelSourceIds: [],
    }
  }

  const config = column.config as Partial<LabelsColumnConfigDto>
  const sources = config.sources

  if (typeof config.allowMultiple !== 'boolean') {
    return {
      allowMultipleLabels: false,
      labelSourceIds: [],
    }
  }

  if (sources === null) {
    return {
      allowMultipleLabels: config.allowMultiple,
      labelSourceIds: [],
    }
  }

  if (
    !sources ||
    typeof sources.includeShared !== 'boolean' ||
    !Array.isArray(sources.noteTypeIds)
  ) {
    return {
      allowMultipleLabels: config.allowMultiple,
      labelSourceIds: [],
    }
  }

  return {
    allowMultipleLabels: config.allowMultiple,
    labelSourceIds: [
      ...(sources.includeShared ? [sharedLabelSourceValue] : []),
      ...sources.noteTypeIds,
    ],
  }
}
