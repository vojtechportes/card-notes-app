import type { NoteDto } from '../../../types/api';
import type { NoteCardFieldValue } from '../types/note-card-field';

export const isImageNoteValue = (
  value: NoteCardFieldValue | undefined,
): value is Extract<NoteDto['values'][string], Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
