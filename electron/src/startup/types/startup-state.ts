import type { StartupFailureReason } from './startup-failure-reason.js'

export type StartupState =
  | { status: 'starting'; phase: 'initial' | 'taking-longer' }
  | { status: 'ready'; apiBaseUrl: string }
  | { status: 'failed'; reason: StartupFailureReason }
