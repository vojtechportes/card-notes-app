import type { ColumnDto, LabelDto } from '../../../types/api'
import { getLabelsColumnConfig } from './get-labels-column-config.util'

export const getLabelOptionsForColumn = (
  column: ColumnDto,
  labels: LabelDto[],
  selectedLabelIds: string[] = []
): LabelDto[] => {
  const config = getLabelsColumnConfig(column)

  if (!config?.sources) {
    return labels
  }

  const selectedLabelIdSet = new Set(selectedLabelIds)

  return labels.filter((label) => {
    if (selectedLabelIdSet.has(label.id)) {
      return true
    }

    if (label.noteTypeId === null) {
      return config.sources?.includeShared
    }

    return config.sources?.noteTypeIds.includes(label.noteTypeId)
  })
}
