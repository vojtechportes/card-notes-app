import type { SyncProviderObjectMappingReader } from '../../types/sync-provider-object-mapping-reader'
import type { OneDriveAccessTokenProvider } from './one-drive-access-token-provider'
import type { OneDriveFetch } from './one-drive-fetch'
import type { OneDriveIdentityProvider } from './one-drive-identity-provider'
import type { OneDriveRetryDelay } from './one-drive-retry-delay'

export interface OneDriveAdapterOptions {
  accessTokenProvider: OneDriveAccessTokenProvider
  identityProvider: OneDriveIdentityProvider
  objectMappingReader: SyncProviderObjectMappingReader
  fetch?: OneDriveFetch
  resumableThreshold?: number
  retryDelay?: OneDriveRetryDelay
  workspaceId?: string
}
