import type { BackendLogOpenResult } from './backend-log-open-result.js'
import type { StartupState } from './startup-state.js'

export interface NoteStackStartupBridge {
  exit: () => Promise<void>
  getState: () => Promise<StartupState>
  openBackendLog: () => Promise<BackendLogOpenResult>
  retry: () => Promise<void>
  subscribe: (listener: (state: StartupState) => void) => () => void
}
