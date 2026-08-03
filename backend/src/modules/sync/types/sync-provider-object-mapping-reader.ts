import type { SyncProviderEnum } from './sync-provider-enum'
import type { SyncProviderObjectMetadata } from './sync-provider-object-metadata'

export interface SyncProviderObjectMappingReader {
  findProviderObjectMetadata(
    provider: SyncProviderEnum,
    workspaceId: string,
    providerObjectId: string
  ): SyncProviderObjectMetadata | null
}
