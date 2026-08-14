import type { LabelDto } from '../../../types/api'

export const getDataGridLabelOptions = (
  labels: LabelDto[],
  noteTypeId: string | null
): LabelDto[] => {
  if (noteTypeId === null) {
    return labels.filter((label) => label.noteTypeId === null)
  }

  return labels.filter(
    (label) => label.noteTypeId === null || label.noteTypeId === noteTypeId
  )
}
