import type { LabelMatchMode } from './label-match-mode'

export interface NotesDataGridFilterPreferences {
  labelIds: string[]
  labelMatchMode: LabelMatchMode
  noteTypeId: string | null
}
