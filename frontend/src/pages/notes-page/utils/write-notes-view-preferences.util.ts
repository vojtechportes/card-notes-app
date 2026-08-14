import { NOTES_VIEW_PREFERENCES_STORAGE_KEY } from '../constants/notes-view-preferences.constants'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import { createDefaultNotesViewPreferences } from './create-default-notes-view-preferences.util'
import { normalizeNotesViewPreferences } from './normalize-notes-view-preferences.util'

export const writeNotesViewPreferences = (
  preferences: NotesViewPreferences,
  storage?: Storage
): void => {
  try {
    const targetStorage = storage ?? window.localStorage
    const normalizedPreferences =
      normalizeNotesViewPreferences(preferences) ??
      createDefaultNotesViewPreferences()

    targetStorage.setItem(
      NOTES_VIEW_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizedPreferences)
    )
  } catch {
    // Preference persistence must never prevent the Notes page from rendering.
  }
}
