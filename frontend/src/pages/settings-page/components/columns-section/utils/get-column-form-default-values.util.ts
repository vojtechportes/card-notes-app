import type { ColumnDto } from '../../../../../types/api'
import { isMultiImageColumn } from '../../../../../utils/is-multi-image-column.util'
import type { ColumnFormValues } from '../types/column-form-values'

export const getColumnFormDefaultValues = (
  column?: ColumnDto
): ColumnFormValues => {
  return {
    isHidden: column?.isHidden ?? false,
    isMultiImage: column ? isMultiImageColumn(column) : false,
    name: column?.name ?? '',
    title: column?.title ?? '',
    type: column?.type === 'labels' ? 'text' : (column?.type ?? 'text'),
  }
}
