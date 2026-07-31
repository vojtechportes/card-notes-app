import { BackgroundEnumDto } from '../../notes/types/background-enum.dto'
import type { SyncNoteDocument } from '../types/sync-note-document'
import { isAssetReferenceValid } from './is-asset-reference-valid.util'
import { isIsoDate } from './is-iso-date.util'
import { isRecord } from './is-record.util'
import { isSyncDocumentMetadataValid } from './is-sync-document-metadata-valid.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isSyncNoteDocumentValid = (
  value: unknown
): value is SyncNoteDocument => {
  if (!isRecord(value) || !isSyncDocumentMetadataValid(value)) {
    return false
  }

  if (
    value.entityType !== 'note' ||
    !isUuidV4(value.entityId) ||
    (value.deletedAt !== null && !isIsoDate(value.deletedAt))
  ) {
    return false
  }

  if (value.deletedAt !== null) {
    return value.payload === null
  }

  if (!isRecord(value.payload) || !isRecord(value.payload.values)) {
    return false
  }

  if (
    !isUuidV4(value.payload.noteTypeId) ||
    !(
      value.payload.background === null ||
      Object.values(BackgroundEnumDto).includes(
        value.payload.background as BackgroundEnumDto
      )
    )
  ) {
    return false
  }

  return Object.values(value.payload.values).every((noteValue) => {
    if (typeof noteValue === 'string') {
      return true
    }

    if (typeof noteValue === 'number') {
      return Number.isFinite(noteValue)
    }

    if (Array.isArray(noteValue)) {
      return (
        noteValue.every((item) => typeof item === 'string') ||
        noteValue.every((item) => isAssetReferenceValid(item))
      )
    }

    return isAssetReferenceValid(noteValue)
  })
}
