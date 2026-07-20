import type { NoteStackWindowControlsBridge } from '../types/notestack-window-controls-bridge'

export const getNoteStackWindowControls =
  (): NoteStackWindowControlsBridge | null => {
    return window.noteStackWindowControls ?? null
  }
