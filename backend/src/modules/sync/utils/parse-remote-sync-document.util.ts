import { SYNC_FORMAT_VERSION } from '../constants/sync-format-version'
import type { ParseSyncDocumentOptions } from '../types/parse-sync-document-options'
import { SyncDocumentQuarantineReasonEnum } from '../types/sync-document-quarantine-reason-enum'
import type { SyncDocumentParseResult } from '../types/sync-document-parse-result'
import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { doesSyncLogicalKeyMatchDocument } from './does-sync-logical-key-match-document.util'
import { hasValidSyncConfigurationRelationships } from './has-valid-sync-configuration-relationships.util'
import { hasValidSyncNoteRelationships } from './has-valid-sync-note-relationships.util'
import { isRecord } from './is-record.util'
import { isSyncConfigurationDocumentValid } from './is-sync-configuration-document-valid.util'
import { isSyncNoteDocumentValid } from './is-sync-note-document-valid.util'
import { isWorkspaceDocumentValid } from './is-workspace-document-valid.util'
import { mapSyncDocument } from './map-sync-document.util'
import { toKnownSyncRemoteDocument } from './to-known-sync-remote-document.util'

export const parseRemoteSyncDocument = (
  logicalKey: string,
  json: string,
  options: ParseSyncDocumentOptions
): SyncDocumentParseResult => {
  let value: unknown

  try {
    value = JSON.parse(json) as unknown
  } catch {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.InvalidJson,
    }
  }

  if (!isRecord(value)) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.InvalidDocument,
    }
  }

  if (
    typeof value.formatVersion === 'number' &&
    value.formatVersion > SYNC_FORMAT_VERSION
  ) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.UnsupportedFormatVersion,
    }
  }

  let document: SyncRemoteDocument

  if (isWorkspaceDocumentValid(value)) {
    document = value
  } else if (isSyncConfigurationDocumentValid(value)) {
    document = value
  } else if (isSyncNoteDocumentValid(value)) {
    document = value
  } else {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.InvalidDocument,
    }
  }

  if (document.workspaceId !== options.expectedWorkspaceId) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.WorkspaceMismatch,
    }
  }

  if (!doesSyncLogicalKeyMatchDocument(logicalKey, document)) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.LogicalKeyMismatch,
    }
  }

  if (
    'entityType' in document &&
    document.entityType === 'configuration' &&
    !hasValidSyncConfigurationRelationships(document)
  ) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.InvalidRelationship,
    }
  }

  if (
    'entityType' in document &&
    document.entityType === 'note' &&
    !hasValidSyncNoteRelationships(document, options)
  ) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.InvalidRelationship,
    }
  }

  const knownDocument = toKnownSyncRemoteDocument(document)
  const mappedDocument = mapSyncDocument(knownDocument)

  if (
    'contentHash' in knownDocument &&
    knownDocument.contentHash !== mappedDocument.contentHash
  ) {
    return {
      status: 'quarantined',
      reason: SyncDocumentQuarantineReasonEnum.ContentHashMismatch,
    }
  }

  return { status: 'accepted', mappedDocument }
}
