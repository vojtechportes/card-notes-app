import type { CardNotesUpdaterBridge } from './card-notes-updater'

declare global {
  interface Window {
    cardNotesUpdater?: CardNotesUpdaterBridge
  }
}

export {}
