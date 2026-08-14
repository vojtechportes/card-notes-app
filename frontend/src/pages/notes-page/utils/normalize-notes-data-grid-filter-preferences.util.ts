import type { NotesDataGridFilterPreferences } from '../types/notes-data-grid-filter-preferences'
import { isRecord } from './is-record.util'
import { normalizePreferenceIdList } from './normalize-preference-id-list.util'

export const normalizeNotesDataGridFilterPreferences = (
  value: unknown
): NotesDataGridFilterPreferences | null => {
  if (!isRecord(value)) {
    return null
  }

  const labelIds = normalizePreferenceIdList(value.labelIds)
  const labelMatchMode = value.labelMatchMode
  const noteTypeId = value.noteTypeId

  if (!labelIds || (labelMatchMode !== 'and' && labelMatchMode !== 'or')) {
    return null
  }

  if (
    noteTypeId !== null &&
    (typeof noteTypeId !== 'string' || noteTypeId.trim().length === 0)
  ) {
    return null
  }

  return {
    labelIds,
    labelMatchMode,
    noteTypeId,
  }
}
