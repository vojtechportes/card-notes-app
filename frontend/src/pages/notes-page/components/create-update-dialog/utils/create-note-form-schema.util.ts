import * as yup from 'yup'
import type { TFunction } from 'i18next'
import type { ColumnDto } from '../../../../../types/api'
import type { FormValues } from '../types/form-values'
import type { NoteFormImageValue } from '../types/note-form-image-value'

export const createNoteFormSchema = (
  columns: ColumnDto[],
  t: TFunction
): yup.ObjectSchema<FormValues> => {
  const valueShape = columns.reduce<Record<string, yup.Schema<unknown>>>(
    (accumulator, column) => {
      switch (column.type) {
        case 'labels':
          accumulator[column.id] = yup
            .array()
            .of(yup.string().defined())
            .defined()
            .test(
              'has-unique-labels',
              t('notes.createUpdateDialog.errors.duplicateLabels'),
              (value) => new Set(value).size === value.length
            )
            .test(
              'has-valid-cardinality',
              t('notes.createUpdateDialog.errors.tooManyLabels'),
              (value) =>
                column.config &&
                typeof column.config === 'object' &&
                column.config.allowMultiple === true
                  ? true
                  : value.length <= 1
            )
          break
        case 'number':
          accumulator[column.id] = yup
            .string()
            .defined()
            .test(
              'is-valid-number',
              t('notes.createUpdateDialog.errors.invalidNumber'),
              (value) => {
                if (!value || value.trim().length === 0) {
                  return true
                }

                return Number.isFinite(Number(value))
              }
            )
          break
        case 'date':
          accumulator[column.id] = yup
            .string()
            .defined()
            .test(
              'is-valid-date',
              t('notes.createUpdateDialog.errors.invalidDate'),
              (value) => {
                if (!value || value.trim().length === 0) {
                  return true
                }

                return !Number.isNaN(Date.parse(value))
              }
            )
          break
        case 'image':
          accumulator[column.id] = yup
            .mixed<NoteFormImageValue>()
            .nullable()
            .test(
              'is-valid-image',
              t('notes.createUpdateDialog.errors.invalidImage'),
              (value) => {
                if (value === null || value === undefined) {
                  return true
                }

                const imageValues = Array.isArray(value) ? value : [value]

                if (imageValues.length === 0) {
                  return false
                }

                return imageValues.every((imageValue) => {
                  if (
                    typeof imageValue !== 'object' ||
                    imageValue === null ||
                    Array.isArray(imageValue)
                  ) {
                    return false
                  }

                  return (
                    typeof imageValue.dataUrl === 'string' ||
                    typeof imageValue.path === 'string' ||
                    typeof imageValue.url === 'string'
                  )
                })
              }
            )
          break
        default:
          accumulator[column.id] = yup.string().defined()
          break
      }

      return accumulator
    },
    {}
  )

  return yup.object({
    values: yup.object(valueShape).defined(),
  }) as yup.ObjectSchema<FormValues>
}
