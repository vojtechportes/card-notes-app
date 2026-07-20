import type { NoteStackStartupBridge } from './notestack-startup-bridge'
import type { NoteStackUpdaterBridge } from './notestack-updater'
import type { NoteStackWindowControlsBridge } from '../components/window-title-bar/types/notestack-window-controls-bridge'

declare global {
  interface Window {
    noteStackStartup?: NoteStackStartupBridge
    noteStackUpdater?: NoteStackUpdaterBridge
    noteStackWindowControls?: NoteStackWindowControlsBridge
  }
}

export {}
