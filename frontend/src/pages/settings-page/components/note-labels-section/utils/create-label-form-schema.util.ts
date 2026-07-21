import * as yup from 'yup'
import type { LabelFormValues } from '../types/label-form-values'

interface LabelValidationMessages {
  colorFormat: string
  colorRequired: string
  nameRequired: string
  sourceRequired: string
  titleRequired: string
}

export const createLabelFormSchema = (
  messages: LabelValidationMessages
): yup.ObjectSchema<LabelFormValues> => {
  return yup
    .object({
      color: yup
        .string()
        .trim()
        .required(messages.colorRequired)
        .matches(/^#[0-9A-Fa-f]{6}$/, messages.colorFormat),
      name: yup.string().trim().required(messages.nameRequired),
      noteTypeId: yup.string().required(messages.sourceRequired),
      title: yup.string().trim().required(messages.titleRequired),
    })
    .required()
}
