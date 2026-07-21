import type { CreateLabelDto } from '../../../../../types/api'
import { sharedLabelSourceValue } from '../constants/shared-label-source-value'
import type { LabelFormValues } from '../types/label-form-values'

export const mapLabelFormValuesToPayload = (
  values: LabelFormValues
): CreateLabelDto => {
  return {
    color: values.color.trim(),
    name: values.name.trim(),
    noteTypeId:
      values.noteTypeId === sharedLabelSourceValue ? null : values.noteTypeId,
    title: values.title.trim(),
  }
}
