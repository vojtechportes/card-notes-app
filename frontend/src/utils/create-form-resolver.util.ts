import { yupResolver } from '@hookform/resolvers/yup'
import type { FieldValues } from 'react-hook-form'
import type { ObjectSchema } from 'yup'

export const createFormResolver = <TFieldValues extends FieldValues>(
  schema: ObjectSchema<TFieldValues>
) => {
  return yupResolver(schema)
}
