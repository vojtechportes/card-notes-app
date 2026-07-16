import type { BackendLogOpenResult } from './backend-log-open-result'
import type { StartupState } from './startup-state'

export interface NoteStackStartupBridge {
  exit: () => Promise<void>
  getState: () => Promise<StartupState>
  openBackendLog: () => Promise<BackendLogOpenResult>
  retry: () => Promise<void>
  subscribe: (listener: (state: StartupState) => void) => () => void
}
