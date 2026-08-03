export interface SyncOrchestrationOptions {
  localDebounceMs?: number
  localDebounceMaxMs?: number
  observerIntervalMs?: number
  watchdogIntervalMs?: number
  staleAfterMs?: number
  retryBaseMs?: number
  retryMaximumMs?: number
  networkRecoveryJitterMs?: number
  random?: () => number
}
