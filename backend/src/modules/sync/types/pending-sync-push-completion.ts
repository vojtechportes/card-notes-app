import type { SyncOutboxEntry } from './sync-outbox-entry'
import type { SyncProviderWriteResult } from './sync-provider-write-result'

export interface PendingSyncPushCompletion {
  entry: SyncOutboxEntry
  writeResult: SyncProviderWriteResult
}
