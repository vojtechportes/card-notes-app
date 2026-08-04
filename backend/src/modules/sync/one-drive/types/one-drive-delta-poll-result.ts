export interface OneDriveDeltaPollResult {
  hasChanges: boolean
  retryAfterMs?: number
  shouldSchedule?: boolean
}
