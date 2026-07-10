import type { TFunction } from 'i18next'
import * as yup from 'yup'
import type { ColumnDto } from '../../../../../types/api'
import { columnTypeOptions } from '../constants/column-type-options'
import type { ColumnFormValues } from '../types/column-form-values'
import { normalizeColumnName } from './normalize-column-name.util'

export const createColumnFormSchema = (
  columns: ColumnDto[],
  t: TFunction,
  editedColumnId?: string
) => {
  return yup.object({
    isHidden: yup.boolean().required(),
    name: yup
      .string()
      .transform((value) => normalizeColumnName(value ?? ''))
      .required(t('settings.columns.validation.nameRequired'))
      .test(
        'unique-name',
        t('settings.columns.validation.nameUnique'),
        (value) => {
          const normalizedName = normalizeColumnName(value ?? '')

          if (!normalizedName) {
            return true
          }

          return !columns.some((column) => {
            if (column.id === editedColumnId) {
              return false
            }

            return normalizeColumnName(column.name) === normalizedName
          })
        }
      ),
    title: yup
      .string()
      .transform((value) => value?.trim() ?? '')
      .required(t('settings.columns.validation.titleRequired')),
    type: yup
      .mixed<ColumnFormValues['type']>()
      .oneOf(columnTypeOptions)
      .required(t('settings.columns.validation.typeRequired')),
  })
}
