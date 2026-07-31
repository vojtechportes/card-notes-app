import type { SyncProviderError } from '../types/sync-provider-error'
import type { FakeSyncProviderOperation } from './fake-sync-provider-operation'

export interface FakeSyncProviderOptions {
  pageSize?: number
  failures?: Partial<Record<FakeSyncProviderOperation, SyncProviderError[]>>
}
