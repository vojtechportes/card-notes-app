export interface SyncReconciliationOptions {
  claimedBy: string
  outboxLimit?: number
  leaseDurationMs?: number
  now?: Date
}
