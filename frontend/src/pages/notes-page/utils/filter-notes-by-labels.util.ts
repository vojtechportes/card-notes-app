import type { ColumnDto, NoteDto } from '../../../types/api'
import type { LabelMatchMode } from '../types/label-match-mode'
import { isLabelIdList } from './is-label-id-list.util'

export const filterNotesByLabels = (
  notes: NoteDto[] | undefined,
  noteTypeColumnsById: Record<string, ColumnDto[]>,
  selectedLabelIds: string[],
  matchMode: LabelMatchMode
): NoteDto[] => {
  const uniqueSelectedLabelIds = [...new Set(selectedLabelIds)]
  const availableNotes = notes ?? []

  if (uniqueSelectedLabelIds.length === 0) {
    return availableNotes
  }

  return availableNotes.filter((note) => {
    const labelColumnIds = new Set(
      (noteTypeColumnsById[note.noteTypeId] ?? [])
        .filter((column) => column.type === 'labels')
        .map((column) => column.id)
    )
    const assignedLabelIds = new Set<string>()

    labelColumnIds.forEach((columnId) => {
      const value = note.values[columnId]

      if (isLabelIdList(value)) {
        value.forEach((labelId) => assignedLabelIds.add(labelId))
      }
    })

    return matchMode === 'and'
      ? uniqueSelectedLabelIds.every((labelId) => assignedLabelIds.has(labelId))
      : uniqueSelectedLabelIds.some((labelId) => assignedLabelIds.has(labelId))
  })
}
