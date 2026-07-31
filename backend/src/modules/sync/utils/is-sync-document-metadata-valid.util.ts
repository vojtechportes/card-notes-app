import { SYNC_FORMAT_VERSION } from '../constants/sync-format-version'
import type { SyncDocumentMetadata } from '../types/sync-document-metadata'
import { isIsoDate } from './is-iso-date.util'
import { isRecord } from './is-record.util'
import { isSha256Hash } from './is-sha-256-hash.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isSyncDocumentMetadataValid = (
  value: unknown
): value is SyncDocumentMetadata => {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.formatVersion === SYNC_FORMAT_VERSION &&
    isUuidV4(value.workspaceId) &&
    isSha256Hash(value.contentHash) &&
    (value.parentHash === null || isSha256Hash(value.parentHash)) &&
    isUuidV4(value.mutationId) &&
    isUuidV4(value.modifiedBy) &&
    isIsoDate(value.modifiedAt)
  )
}
