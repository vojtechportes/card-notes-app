import type { NotesCardFilterPreferences } from '../types/notes-card-filter-preferences'
import { isRecord } from './is-record.util'
import { normalizePreferenceIdList } from './normalize-preference-id-list.util'

export const normalizeNotesCardFilterPreferences = (
  value: unknown
): NotesCardFilterPreferences | null => {
  if (!isRecord(value)) {
    return null
  }

  const noteTypeIds = normalizePreferenceIdList(value.noteTypeIds)
  const labelIds = normalizePreferenceIdList(value.labelIds)
  const labelMatchMode = value.labelMatchMode

  if (
    !noteTypeIds ||
    !labelIds ||
    (labelMatchMode !== 'and' && labelMatchMode !== 'or')
  ) {
    return null
  }

  return {
    labelIds,
    labelMatchMode,
    noteTypeIds,
  }
}
