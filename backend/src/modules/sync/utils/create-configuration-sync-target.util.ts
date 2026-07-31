import type { Database } from 'better-sqlite3'

export const createConfigurationSyncTarget = (database: Database): unknown => {
  const noteTypes = database
    .prepare(
      `SELECT
        id,
        title,
        created_at AS createdAt,
        updated_at AS updatedAt,
        mutation_id AS mutationId,
        modified_by_device_id AS modifiedByDeviceId,
        modified_at AS modifiedAt,
        deleted_at AS deletedAt,
        deletion_mutation_id AS deletionMutationId,
        deletion_device_id AS deletionDeviceId
      FROM note_types ORDER BY id ASC`
    )
    .all()
  const columns = (
    database
      .prepare(
        `SELECT
          id,
          note_type_id AS noteTypeId,
          name,
          title,
          type,
          sort_order AS sortOrder,
          is_hidden AS isHidden,
          is_hidden_in_detail AS isHiddenInDetail,
          is_default AS isDefault,
          config_json,
          created_at AS createdAt,
          updated_at AS updatedAt,
          mutation_id AS mutationId,
          modified_by_device_id AS modifiedByDeviceId,
          modified_at AS modifiedAt,
          deleted_at AS deletedAt,
          deletion_mutation_id AS deletionMutationId,
          deletion_device_id AS deletionDeviceId
        FROM note_columns ORDER BY id ASC`
      )
      .all() as Array<Record<string, unknown> & { config_json: string | null }>
  ).map(({ config_json: configJson, ...column }) => ({
    ...column,
    config: configJson === null ? null : (JSON.parse(configJson) as unknown),
  }))
  const labels = database
    .prepare(
      `SELECT
        id,
        title,
        name,
        color,
        note_type_id AS noteTypeId,
        created_at AS createdAt,
        updated_at AS updatedAt,
        mutation_id AS mutationId,
        modified_by_device_id AS modifiedByDeviceId,
        modified_at AS modifiedAt,
        deleted_at AS deletedAt,
        deletion_mutation_id AS deletionMutationId,
        deletion_device_id AS deletionDeviceId
      FROM labels ORDER BY id ASC`
    )
    .all()
  const generalSettings = (
    database
      .prepare(
        `SELECT
          key,
          value_json,
          updated_at AS updatedAt,
          mutation_id AS mutationId,
          modified_by_device_id AS modifiedByDeviceId,
          modified_at AS modifiedAt
        FROM app_settings ORDER BY key ASC`
      )
      .all() as Array<Record<string, unknown> & { value_json: string }>
  ).map(({ value_json: valueJson, ...setting }) => ({
    ...setting,
    value: JSON.parse(valueJson) as unknown,
  }))

  return { noteTypes, columns, labels, generalSettings }
}
