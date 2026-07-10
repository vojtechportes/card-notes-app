import type { ColumnDto } from '../../../../../types/api'
import type { ColumnFormValues } from '../types/column-form-values'

export const getColumnFormDefaultValues = (
  column?: ColumnDto
): ColumnFormValues => {
  return {
    isHidden: column?.isHidden ?? false,
    name: column?.name ?? '',
    title: column?.title ?? '',
    type: column?.type ?? 'text',
  }
}
