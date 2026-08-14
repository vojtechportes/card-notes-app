import type { ColumnDto, LabelDto, NoteTypeDto } from '../../../types/api'

export interface UseNotesViewPreferencesOptions {
  areColumnsReady: boolean
  areLabelsReady: boolean
  areNoteTypesReady: boolean
  columnsByNoteTypeId: Record<string, ColumnDto[]>
  labels: LabelDto[]
  noteTypes: NoteTypeDto[]
  storage?: Storage
}
