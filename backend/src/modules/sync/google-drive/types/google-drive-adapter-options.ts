import type { GoogleDriveAccessTokenProvider } from './google-drive-access-token-provider'
import type { GoogleDriveFetch } from './google-drive-fetch'
import type { SyncProviderObjectMappingReader } from '../../types/sync-provider-object-mapping-reader'

export interface GoogleDriveAdapterOptions {
  accessTokenProvider: GoogleDriveAccessTokenProvider
  objectMappingReader: SyncProviderObjectMappingReader
  fetch?: GoogleDriveFetch
  resumableThreshold?: number
  workspaceId?: string
}
