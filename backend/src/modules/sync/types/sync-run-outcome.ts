import type { SyncPublicStatus } from './sync-public-status'

export interface SyncRunOutcome {
  status: SyncPublicStatus
  hasChanges: boolean
  error: unknown | null
  retryScheduled: boolean
}
