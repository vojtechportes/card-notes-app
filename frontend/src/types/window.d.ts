import type { NoteStackStartupBridge } from './notestack-startup-bridge'
import type { NoteStackUpdaterBridge } from './notestack-updater'

declare global {
  interface Window {
    noteStackStartup?: NoteStackStartupBridge
    noteStackUpdater?: NoteStackUpdaterBridge
  }
}

export {}
