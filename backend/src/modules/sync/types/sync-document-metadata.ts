import type { SYNC_FORMAT_VERSION } from '../constants/sync-format-version'

export interface SyncDocumentMetadata {
  formatVersion: typeof SYNC_FORMAT_VERSION
  workspaceId: string
  contentHash: string
  parentHash: string | null
  mutationId: string
  modifiedBy: string
  modifiedAt: string
}
