import { ColumnTypeEnum } from '../../settings/types/column-type-enum'
import type { SyncConfigurationDocument } from '../types/sync-configuration-document'
import type { SyncColumnPayload } from '../types/sync-column-payload'
import type { SyncGeneralSettingsPayload } from '../types/sync-general-settings-payload'
import type { SyncLabelPayload } from '../types/sync-label-payload'
import type { SyncNoteTypePayload } from '../types/sync-note-type-payload'
import { isRecord } from './is-record.util'
import { isSyncConfigurationEntityValid } from './is-sync-configuration-entity-valid.util'
import { isSyncDocumentMetadataValid } from './is-sync-document-metadata-valid.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isSyncConfigurationDocumentValid = (
  value: unknown
): value is SyncConfigurationDocument => {
  if (
    !isRecord(value) ||
    !isSyncDocumentMetadataValid(value) ||
    value.entityType !== 'configuration' ||
    value.entityId !== 'configuration' ||
    !isRecord(value.payload)
  ) {
    return false
  }

  const payload = value.payload
  const validColumnTypes = new Set<string>(Object.values(ColumnTypeEnum))

  return (
    Array.isArray(payload.noteTypes) &&
    payload.noteTypes.every((entity) =>
      isSyncConfigurationEntityValid<SyncNoteTypePayload>(
        entity,
        (noteType): noteType is SyncNoteTypePayload =>
          isRecord(noteType) &&
          typeof noteType.title === 'string' &&
          typeof noteType.orderKey === 'string'
      )
    ) &&
    Array.isArray(payload.columns) &&
    payload.columns.every((entity) =>
      isSyncConfigurationEntityValid<SyncColumnPayload>(
        entity,
        (column): column is SyncColumnPayload =>
          isRecord(column) &&
          isUuidV4(column.noteTypeId) &&
          typeof column.name === 'string' &&
          typeof column.title === 'string' &&
          typeof column.type === 'string' &&
          validColumnTypes.has(column.type) &&
          typeof column.orderKey === 'string' &&
          typeof column.isHidden === 'boolean' &&
          typeof column.isHiddenInDetail === 'boolean' &&
          typeof column.isDefault === 'boolean' &&
          (column.config === null || isRecord(column.config))
      )
    ) &&
    Array.isArray(payload.labels) &&
    payload.labels.every((entity) =>
      isSyncConfigurationEntityValid<SyncLabelPayload>(
        entity,
        (label): label is SyncLabelPayload =>
          isRecord(label) &&
          typeof label.title === 'string' &&
          typeof label.name === 'string' &&
          typeof label.color === 'string' &&
          (label.noteTypeId === null || isUuidV4(label.noteTypeId))
      )
    ) &&
    isSyncConfigurationEntityValid<SyncGeneralSettingsPayload>(
      payload.generalSettings,
      (settings): settings is SyncGeneralSettingsPayload =>
        isRecord(settings) &&
        (settings.textTruncationLength === null ||
          (Number.isInteger(settings.textTruncationLength) &&
            Number(settings.textTruncationLength) >= 0)) &&
        (settings.cardFieldDisplayCount === null ||
          (Number.isInteger(settings.cardFieldDisplayCount) &&
            Number(settings.cardFieldDisplayCount) >= 0)) &&
        (settings.mergeDateTimeFields === null ||
          typeof settings.mergeDateTimeFields === 'boolean')
    )
  )
}
