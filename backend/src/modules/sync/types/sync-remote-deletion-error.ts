export class SyncRemoteDeletionError extends Error {
  constructor(public readonly logicalKey: string) {
    super(`Remote object disappeared without a tombstone: ${logicalKey}`)
    this.name = 'SyncRemoteDeletionError'
  }
}
