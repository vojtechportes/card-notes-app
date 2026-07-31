import type { Database } from 'better-sqlite3'

export const tombstoneSyncConfigurationEntity = (
  database: Database,
  table: 'note_types' | 'note_columns' | 'labels',
  id: string,
  mutationId: string,
  modifiedBy: string,
  modifiedAt: string
): void => {
  database
    .prepare(
      `UPDATE ${table} SET deleted_at = @modifiedAt,
        deletion_mutation_id = @mutationId, deletion_device_id = @modifiedBy,
        mutation_id = @mutationId, modified_by_device_id = @modifiedBy,
        modified_at = @modifiedAt, updated_at = @modifiedAt WHERE id = @id`
    )
    .run({ id, mutationId, modifiedBy, modifiedAt })
}
