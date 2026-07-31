import type { SyncConfigurationEntity } from '../types/sync-configuration-entity'
import { normalizeSyncDate } from './normalize-sync-date.util'

export const createSyncConfigurationEntity = <TPayload>(
  row: Record<string, unknown>,
  payload: TPayload | null
): SyncConfigurationEntity<TPayload> => ({
  id: String(row.id),
  payload,
  mutationId: String(
    row.deleted_at ? row.deletion_mutation_id : row.mutation_id
  ),
  modifiedBy: String(
    row.deleted_at ? row.deletion_device_id : row.modified_by_device_id
  ),
  modifiedAt: normalizeSyncDate(row.modified_at),
  deletedAt: row.deleted_at === null ? null : normalizeSyncDate(row.deleted_at),
})
