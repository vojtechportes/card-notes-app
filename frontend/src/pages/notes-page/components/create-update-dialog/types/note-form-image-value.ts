import type { NoteDto } from '../../../../../types/api';

export type NoteFormImageValue = Extract<
  NoteDto['values'][string],
  Record<string, unknown>
>;
