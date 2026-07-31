import type { SyncProviderAdapter } from '../../../../src/modules/sync/types/sync-provider-adapter'

export interface SyncProviderAdapterContractDriver {
  adapter: SyncProviderAdapter
  expireCursor(cursor: string): Promise<void> | void
}
