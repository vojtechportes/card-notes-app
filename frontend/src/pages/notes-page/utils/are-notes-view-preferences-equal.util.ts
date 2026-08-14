import type { NotesViewPreferences } from '../types/notes-view-preferences'

export const areNotesViewPreferencesEqual = (
  first: NotesViewPreferences,
  second: NotesViewPreferences
): boolean => {
  return JSON.stringify(first) === JSON.stringify(second)
}
