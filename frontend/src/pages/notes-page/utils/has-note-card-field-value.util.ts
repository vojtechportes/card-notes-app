import type {
  NoteCardField,
  NoteCardFieldValue,
} from '../types/note-card-field'
import { hasRenderableNoteCardValue } from './has-renderable-note-card-value.util'

export const hasNoteCardFieldValue = (
  field: Omit<NoteCardField, 'value'> & {
    value: NoteCardFieldValue | undefined
  }
): field is NoteCardField => {
  return hasRenderableNoteCardValue(field.value)
}
