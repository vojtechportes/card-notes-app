import type { LabelMatchMode } from './label-match-mode'

export interface NotesCardFilterPreferences {
  labelIds: string[]
  labelMatchMode: LabelMatchMode
  noteTypeIds: string[]
}
