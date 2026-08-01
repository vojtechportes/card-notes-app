import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'

export interface PulledSyncAsset {
  assetId: string
  metadata: SyncProviderObjectMetadata
}
