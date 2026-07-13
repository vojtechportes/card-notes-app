import type { NoteStackUpdaterBridge } from '../types/notestack-updater'

export const getNoteStackUpdater = (): NoteStackUpdaterBridge | null => {
  return window.noteStackUpdater ?? null
}
