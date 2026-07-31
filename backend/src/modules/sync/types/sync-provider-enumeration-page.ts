import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'

export interface SyncProviderEnumerationPage {
  objects: SyncProviderObjectMetadata[]
  nextPageToken: string | null
  candidateCursor: string
}
