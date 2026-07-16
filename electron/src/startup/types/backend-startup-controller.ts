import type { StartupState } from './startup-state.js'

export interface BackendStartupController {
  dispose: () => void
  getState: () => StartupState
  retry: () => Promise<void>
  start: () => void
}
