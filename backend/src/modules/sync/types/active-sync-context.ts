import type { SyncProviderEnum } from './sync-provider-enum'

export interface ActiveSyncContext {
  workspaceId: string
  deviceId: string
  provider: SyncProviderEnum
}
