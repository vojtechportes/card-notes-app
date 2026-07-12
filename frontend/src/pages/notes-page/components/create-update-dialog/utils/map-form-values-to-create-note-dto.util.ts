import type { ColumnDto, CreateNoteDto } from '../../../../../types/api'
import type { FormValues } from '../types/form-values'

export const mapFormValuesToCreateNoteDto = (
  columns: ColumnDto[],
  formValues: FormValues,
  noteTypeId: string
): CreateNoteDto => {
  const values = columns.reduce<NonNullable<CreateNoteDto['values']>>(
    (accumulator, column) => {
      const value = formValues.values[column.id]

      if (column.type === 'image') {
        if (value) {
          accumulator[column.id] = value
        }

        return accumulator
      }

      if (typeof value !== 'string' || value.trim().length === 0) {
        return accumulator
      }

      accumulator[column.id] = column.type === 'number' ? Number(value) : value
      return accumulator
    },
    {}
  )

  if (Object.keys(values).length > 0) {
    return {
      noteTypeId,
      values,
    }
  }

  return {
    noteTypeId,
  }
}
