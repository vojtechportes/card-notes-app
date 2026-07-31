import type { Database } from 'better-sqlite3'
import type { SyncConfigurationDocument } from '../types/sync-configuration-document'
import { tombstoneSyncConfigurationEntity } from './tombstone-sync-configuration-entity.util'

export const applyRemoteConfigurationDocument = (
  database: Database,
  document: SyncConfigurationDocument
): void => {
  const upsertNoteType = database.prepare(`
    INSERT INTO note_types (
      id, title, created_at, updated_at, mutation_id, modified_by_device_id,
      modified_at, deleted_at, deletion_mutation_id, deletion_device_id
    ) VALUES (
      @id, @title, @modifiedAt, @modifiedAt, @mutationId, @modifiedBy,
      @modifiedAt, NULL, NULL, NULL
    ) ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, updated_at = excluded.updated_at,
      mutation_id = excluded.mutation_id,
      modified_by_device_id = excluded.modified_by_device_id,
      modified_at = excluded.modified_at, deleted_at = NULL,
      deletion_mutation_id = NULL, deletion_device_id = NULL
  `)

  for (const entity of document.payload.noteTypes) {
    if (!entity.payload) {
      tombstoneSyncConfigurationEntity(
        database,
        'note_types',
        entity.id,
        entity.mutationId,
        entity.modifiedBy,
        entity.modifiedAt
      )
      continue
    }
    upsertNoteType.run({ ...entity, title: entity.payload.title })
  }

  const upsertColumn = database.prepare(`
    INSERT INTO note_columns (
      id, note_type_id, name, title, type, sort_order, is_hidden,
      is_hidden_in_detail, is_default, config_json, created_at, updated_at,
      mutation_id, modified_by_device_id, modified_at
    ) VALUES (
      @id, @noteTypeId, @name, @title, @type, @sortOrder, @isHidden,
      @isHiddenInDetail, @isDefault, @configJson, @modifiedAt, @modifiedAt,
      @mutationId, @modifiedBy, @modifiedAt
    ) ON CONFLICT(id) DO UPDATE SET
      note_type_id = excluded.note_type_id, name = excluded.name,
      title = excluded.title, type = excluded.type,
      sort_order = excluded.sort_order, is_hidden = excluded.is_hidden,
      is_hidden_in_detail = excluded.is_hidden_in_detail,
      is_default = excluded.is_default, config_json = excluded.config_json,
      updated_at = excluded.updated_at, mutation_id = excluded.mutation_id,
      modified_by_device_id = excluded.modified_by_device_id,
      modified_at = excluded.modified_at, deleted_at = NULL,
      deletion_mutation_id = NULL, deletion_device_id = NULL
  `)
  for (const entity of document.payload.columns) {
    if (!entity.payload) {
      tombstoneSyncConfigurationEntity(
        database,
        'note_columns',
        entity.id,
        entity.mutationId,
        entity.modifiedBy,
        entity.modifiedAt
      )
      continue
    }
    upsertColumn.run({
      ...entity,
      ...entity.payload,
      sortOrder: Number(entity.payload.orderKey),
      isHidden: entity.payload.isHidden ? 1 : 0,
      isHiddenInDetail: entity.payload.isHiddenInDetail ? 1 : 0,
      isDefault: entity.payload.isDefault ? 1 : 0,
      configJson:
        entity.payload.config === null
          ? null
          : JSON.stringify(entity.payload.config),
    })
  }

  const upsertLabel = database.prepare(`
    INSERT INTO labels (
      id, title, name, color, note_type_id, created_at, updated_at,
      mutation_id, modified_by_device_id, modified_at
    ) VALUES (
      @id, @title, @name, @color, @noteTypeId, @modifiedAt, @modifiedAt,
      @mutationId, @modifiedBy, @modifiedAt
    ) ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, name = excluded.name, color = excluded.color,
      note_type_id = excluded.note_type_id, updated_at = excluded.updated_at,
      mutation_id = excluded.mutation_id,
      modified_by_device_id = excluded.modified_by_device_id,
      modified_at = excluded.modified_at, deleted_at = NULL,
      deletion_mutation_id = NULL, deletion_device_id = NULL
  `)
  for (const entity of document.payload.labels) {
    if (!entity.payload) {
      tombstoneSyncConfigurationEntity(
        database,
        'labels',
        entity.id,
        entity.mutationId,
        entity.modifiedBy,
        entity.modifiedAt
      )
      continue
    }
    upsertLabel.run({ ...entity, ...entity.payload })
  }

  const settings = document.payload.generalSettings
  if (settings.payload) {
    const upsertSetting = database.prepare(`
      INSERT INTO app_settings (
        key, value_json, updated_at, mutation_id, modified_by_device_id, modified_at
      ) VALUES (@key, @valueJson, @modifiedAt, @mutationId, @modifiedBy, @modifiedAt)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
        updated_at = excluded.updated_at, mutation_id = excluded.mutation_id,
        modified_by_device_id = excluded.modified_by_device_id,
        modified_at = excluded.modified_at
    `)
    for (const [key, value] of Object.entries(settings.payload)) {
      upsertSetting.run({
        key,
        valueJson: JSON.stringify(value),
        mutationId: settings.mutationId,
        modifiedBy: settings.modifiedBy,
        modifiedAt: settings.modifiedAt,
      })
    }
  }
}
