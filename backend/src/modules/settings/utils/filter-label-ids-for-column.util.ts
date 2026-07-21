import type { NoteValue } from '../../notes/types/note-value'
import type { Label } from '../types/label'
import type { LabelsColumnConfig } from '../types/labels-column-config'

export const filterLabelIdsForColumn = (
  value: NoteValue,
  config: LabelsColumnConfig,
  labels: Label[]
): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const labelsById = new Map(labels.map((label) => [label.id, label]))
  const acceptedLabelIds: string[] = []
  const seenLabelIds = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string' || seenLabelIds.has(item)) {
      continue
    }

    seenLabelIds.add(item)
    const label = labelsById.get(item)

    if (!label) {
      continue
    }

    const isAllowed =
      config.sources === null ||
      (label.noteTypeId === null
        ? config.sources.includeShared
        : config.sources.noteTypeIds.includes(label.noteTypeId))

    if (!isAllowed) {
      continue
    }

    acceptedLabelIds.push(item)

    if (!config.allowMultiple) {
      break
    }
  }

  return acceptedLabelIds
}
