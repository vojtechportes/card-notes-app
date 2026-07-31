import type { Database } from 'better-sqlite3'
import { syncGeneralSettingsEntityId } from '../constants/sync-general-settings-entity-id'
import type { MappedSyncDocument } from '../types/mapped-sync-document'
import type { SyncColumnPayload } from '../types/sync-column-payload'
import type { SyncConfigurationDocument } from '../types/sync-configuration-document'
import type { SyncConfigurationPayload } from '../types/sync-configuration-payload'
import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { createSyncConfigurationEntity } from './create-sync-configuration-entity.util'
import { mapSyncDocument } from './map-sync-document.util'
import { normalizeSyncDate } from './normalize-sync-date.util'

export const createLocalConfigurationSyncDocument = (
  database: Database,
  workspaceId: string,
  parentHash: string | null
): MappedSyncDocument<SyncRemoteDocument> | null => {
  const noteTypeRows = database
    .prepare('SELECT * FROM note_types')
    .all() as Array<Record<string, unknown>>
  const columnRows = database
    .prepare('SELECT * FROM note_columns')
    .all() as Array<Record<string, unknown>>
  const labelRows = database.prepare('SELECT * FROM labels').all() as Array<
    Record<string, unknown>
  >
  const settingRows = database
    .prepare('SELECT * FROM app_settings')
    .all() as Array<Record<string, unknown>>
  const authoritativeRows = [
    ...noteTypeRows,
    ...columnRows,
    ...labelRows,
    ...settingRows,
  ].filter(
    (row) => row.mutation_id && row.modified_by_device_id && row.modified_at
  )

  if (authoritativeRows.length === 0) {
    return null
  }

  authoritativeRows.sort((left, right) => {
    const timeComparison = String(right.modified_at).localeCompare(
      String(left.modified_at)
    )
    return (
      timeComparison ||
      String(right.mutation_id).localeCompare(String(left.mutation_id))
    )
  })
  const authority = authoritativeRows[0]
  const storedSettings = Object.fromEntries(
    settingRows.map((row) => [
      String(row.key),
      JSON.parse(String(row.value_json)),
    ])
  )
  const generalSettings: SyncConfigurationPayload['generalSettings']['payload'] =
    {
      textTruncationLength:
        (storedSettings.textTruncationLength as number | null | undefined) ??
        null,
      cardFieldDisplayCount:
        (storedSettings.cardFieldDisplayCount as number | null | undefined) ??
        null,
      mergeDateTimeFields:
        (storedSettings.mergeDateTimeFields as boolean | null | undefined) ??
        null,
    }
  const settingsAuthority =
    settingRows
      .filter(
        (row) => row.mutation_id && row.modified_by_device_id && row.modified_at
      )
      .sort((left, right) =>
        String(right.modified_at).localeCompare(String(left.modified_at))
      )[0] ?? authority
  const payload: SyncConfigurationPayload = {
    noteTypes: noteTypeRows.map((row, index) =>
      createSyncConfigurationEntity(
        row,
        row.deleted_at
          ? null
          : {
              title: String(row.title),
              orderKey: String(index).padStart(8, '0'),
            }
      )
    ),
    columns: columnRows.map((row) =>
      createSyncConfigurationEntity(
        row,
        row.deleted_at
          ? null
          : {
              noteTypeId: String(row.note_type_id),
              name: String(row.name),
              title: String(row.title),
              type: row.type as SyncColumnPayload['type'],
              orderKey: String(row.sort_order).padStart(8, '0'),
              isHidden: Boolean(row.is_hidden),
              isHiddenInDetail: Boolean(row.is_hidden_in_detail),
              isDefault: Boolean(row.is_default),
              config:
                row.config_json === null
                  ? null
                  : JSON.parse(String(row.config_json)),
            }
      )
    ),
    labels: labelRows.map((row) =>
      createSyncConfigurationEntity(
        row,
        row.deleted_at
          ? null
          : {
              title: String(row.title),
              name: String(row.name),
              color: String(row.color),
              noteTypeId:
                row.note_type_id === null ? null : String(row.note_type_id),
            }
      )
    ),
    generalSettings: {
      id: syncGeneralSettingsEntityId,
      payload: generalSettings,
      mutationId: String(settingsAuthority.mutation_id),
      modifiedBy: String(settingsAuthority.modified_by_device_id),
      modifiedAt: normalizeSyncDate(settingsAuthority.modified_at),
      deletedAt: null,
    },
  }
  const draft: Omit<SyncConfigurationDocument, 'contentHash'> = {
    formatVersion: 1,
    workspaceId,
    parentHash,
    mutationId: String(authority.mutation_id),
    modifiedBy: String(authority.modified_by_device_id),
    modifiedAt: normalizeSyncDate(authority.modified_at),
    entityType: 'configuration',
    entityId: 'configuration',
    payload,
  }

  return mapSyncDocument(draft)
}
