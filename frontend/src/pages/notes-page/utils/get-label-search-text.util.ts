import type { LabelDto, NoteDto } from '../../../types/api'
import { isLabelIdList } from './is-label-id-list.util'

export const getLabelSearchText = (
  note: NoteDto,
  labelById: ReadonlyMap<string, LabelDto>
): string => {
  const assignedLabelIds = Object.values(note.values).flatMap((value) =>
    isLabelIdList(value) ? value : []
  )

  return [
    ...new Set(
      assignedLabelIds.flatMap((labelId) => {
        const label = labelById.get(labelId)

        return label ? [label.title, label.name] : []
      })
    ),
  ].join(' ')
}
