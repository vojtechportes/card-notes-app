export type StartupFailureReason =
  | 'bridge-unavailable'
  | 'entrypoint-missing'
  | 'spawn-error'
  | 'process-exited'
  | 'termination-failed'
