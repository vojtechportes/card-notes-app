import type { StartupFailureReason } from './startup-failure-reason'

export type StartupState =
  | { status: 'starting'; phase: 'initial' | 'taking-longer' }
  | { status: 'ready' }
  | { status: 'failed'; reason: StartupFailureReason }
