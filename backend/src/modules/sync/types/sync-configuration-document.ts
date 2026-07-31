import type { SyncConfigurationPayload } from './sync-configuration-payload'
import type { SyncDocumentMetadata } from './sync-document-metadata'

export interface SyncConfigurationDocument extends SyncDocumentMetadata {
  entityType: 'configuration'
  entityId: 'configuration'
  payload: SyncConfigurationPayload
}
