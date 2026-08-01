import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'

export interface CollectedSyncChanges {
  metadata: SyncProviderObjectMetadata[]
  candidateCursor: string
  wasFullEnumeration: boolean
}
