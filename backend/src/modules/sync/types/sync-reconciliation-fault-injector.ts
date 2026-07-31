import type { SyncReconciliationCrashBoundary } from './sync-reconciliation-crash-boundary'

export interface SyncReconciliationFaultInjector {
  reach(boundary: SyncReconciliationCrashBoundary): void
}
