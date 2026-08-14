import type { NotesCardFilterPreferences } from './notes-card-filter-preferences'
import type { NotesDataGridColumnWidths } from './notes-data-grid-column-widths'
import type { NotesDataGridFilterPreferences } from './notes-data-grid-filter-preferences'
import type { NotesViewMode } from './notes-view-mode'

export interface NotesViewPreferences {
  version: 1
  viewMode: NotesViewMode
  card: NotesCardFilterPreferences
  dataGrid: NotesDataGridFilterPreferences
  dataGridColumnWidths: NotesDataGridColumnWidths
}
