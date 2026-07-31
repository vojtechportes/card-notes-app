export class SyncConcurrentChangeError extends Error {
  constructor(public readonly logicalKey: string) {
    super(
      `Concurrent synchronization change requires reconciliation: ${logicalKey}`
    )
    this.name = 'SyncConcurrentChangeError'
  }
}
