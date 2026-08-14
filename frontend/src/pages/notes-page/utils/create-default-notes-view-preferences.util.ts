import { NOTES_VIEW_PREFERENCES_VERSION } from '../constants/notes-view-preferences.constants'
import type { NotesViewPreferences } from '../types/notes-view-preferences'

export const createDefaultNotesViewPreferences = (): NotesViewPreferences => ({
  version: NOTES_VIEW_PREFERENCES_VERSION,
  viewMode: 'card',
  card: {
    labelIds: [],
    labelMatchMode: 'or',
    noteTypeIds: [],
  },
  dataGrid: {
    labelIds: [],
    labelMatchMode: 'or',
    noteTypeId: null,
  },
  dataGridColumnWidths: {},
})
