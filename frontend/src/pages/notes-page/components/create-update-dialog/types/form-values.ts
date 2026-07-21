import type { NoteFormImageValue } from './note-form-image-value'

export type NoteFormFieldValue =
  string | string[] | NoteFormImageValue | NoteFormImageValue[] | null

export interface FormValues {
  values: Record<string, NoteFormFieldValue>
}
