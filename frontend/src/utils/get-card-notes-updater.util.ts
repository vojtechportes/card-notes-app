import type { CardNotesUpdaterBridge } from '../types/card-notes-updater'

export const getCardNotesUpdater = (): CardNotesUpdaterBridge | null => {
  return window.cardNotesUpdater ?? null
}
