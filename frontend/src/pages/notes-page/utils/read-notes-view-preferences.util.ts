import { NOTES_VIEW_PREFERENCES_STORAGE_KEY } from '../constants/notes-view-preferences.constants'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import { createDefaultNotesViewPreferences } from './create-default-notes-view-preferences.util'
import { normalizeNotesViewPreferences } from './normalize-notes-view-preferences.util'

export const readNotesViewPreferences = (
  storage?: Storage
): NotesViewPreferences => {
  try {
    const targetStorage = storage ?? window.localStorage
    const serializedPreferences = targetStorage.getItem(
      NOTES_VIEW_PREFERENCES_STORAGE_KEY
    )

    if (!serializedPreferences) {
      return createDefaultNotesViewPreferences()
    }

    const preferences = normalizeNotesViewPreferences(
      JSON.parse(serializedPreferences) as unknown
    )

    return preferences ?? createDefaultNotesViewPreferences()
  } catch {
    return createDefaultNotesViewPreferences()
  }
}
