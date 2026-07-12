import * as yup from 'yup'

export const createNoteTypeFormSchema = (requiredMessage: string) => {
  return yup.object({
    title: yup.string().trim().required(requiredMessage),
  })
}
