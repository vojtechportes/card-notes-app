import type { BackgroundEnumDto } from './background-enum.dto'
import type { NoteValuePatch, NoteValues } from './note-value'

export interface Note {
  id: string
  noteTypeId: string
  background: BackgroundEnumDto | null
  values: NoteValues
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  noteTypeId: string
  values?: NoteValues
}

export interface UpdateNoteInput {
  values?: NoteValuePatch
}
