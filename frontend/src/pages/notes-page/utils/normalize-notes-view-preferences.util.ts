import { NOTES_VIEW_PREFERENCES_VERSION } from '../constants/notes-view-preferences.constants'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import { isRecord } from './is-record.util'
import { normalizeNotesCardFilterPreferences } from './normalize-notes-card-filter-preferences.util'
import { normalizeNotesDataGridColumnWidths } from './normalize-notes-data-grid-column-widths.util'
import { normalizeNotesDataGridFilterPreferences } from './normalize-notes-data-grid-filter-preferences.util'

export const normalizeNotesViewPreferences = (
  value: unknown
): NotesViewPreferences | null => {
  if (!isRecord(value) || value.version !== NOTES_VIEW_PREFERENCES_VERSION) {
    return null
  }

  if (value.viewMode !== 'card' && value.viewMode !== 'data-grid') {
    return null
  }

  const card = normalizeNotesCardFilterPreferences(value.card)
  const dataGrid = normalizeNotesDataGridFilterPreferences(value.dataGrid)
  const dataGridColumnWidths = normalizeNotesDataGridColumnWidths(
    value.dataGridColumnWidths
  )

  if (!card || !dataGrid || !dataGridColumnWidths) {
    return null
  }

  return {
    version: NOTES_VIEW_PREFERENCES_VERSION,
    viewMode: value.viewMode,
    card,
    dataGrid,
    dataGridColumnWidths,
  }
}
