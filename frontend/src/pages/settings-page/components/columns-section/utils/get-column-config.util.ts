import type { CreateColumnDto } from '../../../../../types/api'
import { sharedLabelSourceValue } from '../constants/shared-label-source-value'
import type { ColumnFormValues } from '../types/column-form-values'

export const getColumnConfig = (
  values: ColumnFormValues
): CreateColumnDto['config'] => {
  if (values.type === 'image') {
    return { isMultiImage: values.isMultiImage }
  }

  if (values.type !== 'labels') {
    return null
  }

  const uniqueSourceIds = [...new Set(values.labelSourceIds)]

  if (uniqueSourceIds.length === 0) {
    return {
      allowMultiple: values.allowMultipleLabels,
      sources: null,
    }
  }

  return {
    allowMultiple: values.allowMultipleLabels,
    sources: {
      includeShared: uniqueSourceIds.includes(sharedLabelSourceValue),
      noteTypeIds: uniqueSourceIds.filter(
        (sourceId) => sourceId !== sharedLabelSourceValue
      ),
    },
  }
}
