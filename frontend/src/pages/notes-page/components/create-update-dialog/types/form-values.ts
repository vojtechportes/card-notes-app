import type { NoteFormImageValue } from './note-form-image-value';

export type NoteFormFieldValue = string | NoteFormImageValue | null;

export interface FormValues {
  values: Record<string, NoteFormFieldValue>;
}
