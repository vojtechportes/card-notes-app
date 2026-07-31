import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'

export interface SyncProviderChangePage {
  changes: SyncProviderObjectMetadata[]
  nextPageToken: string | null
  candidateCursor: string
}
