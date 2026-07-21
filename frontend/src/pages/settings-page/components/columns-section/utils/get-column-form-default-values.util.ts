import type { ColumnDto } from '../../../../../types/api'
import { isMultiImageColumn } from '../../../../../utils/is-multi-image-column.util'
import type { ColumnFormValues } from '../types/column-form-values'
import { getLabelsColumnFormDefaultValues } from './get-labels-column-form-default-values.util'

export const getColumnFormDefaultValues = (
  column?: ColumnDto
): ColumnFormValues => {
  return {
    ...getLabelsColumnFormDefaultValues(column),
    isHidden: column?.isHidden ?? false,
    isMultiImage: column ? isMultiImageColumn(column) : false,
    name: column?.name ?? '',
    title: column?.title ?? '',
    type: column?.type ?? 'text',
  }
}
