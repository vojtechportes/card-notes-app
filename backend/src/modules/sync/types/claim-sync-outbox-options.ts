export interface ClaimSyncOutboxOptions {
  claimedBy: string
  leaseDurationMs: number
  limit: number
  now?: Date
}
