import type { SyncProviderAdapter } from './sync-provider-adapter'
import type { SyncProviderEnum } from './sync-provider-enum'

export interface SyncProviderFactoryContract {
  create(provider: SyncProviderEnum, workspaceId: string): SyncProviderAdapter
}
