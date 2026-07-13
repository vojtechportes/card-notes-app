import type { NoteStackUpdaterBridge } from './notestack-updater'

declare global {
  interface Window {
    noteStackUpdater?: NoteStackUpdaterBridge
  }
}

export {}
