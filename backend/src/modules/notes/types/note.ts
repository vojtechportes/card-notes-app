import type { NoteValuePatch, NoteValues } from './note-value'

export interface Note {
  id: string
  noteTypeId: string
  values: NoteValues
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  values?: NoteValues
}

export interface UpdateNoteInput {
  values?: NoteValuePatch
}
