import type { SyncConfigurationEntity } from '../types/sync-configuration-entity'

export const copySyncConfigurationEntity = <TPayload, TCopy>(
  entity: SyncConfigurationEntity<TPayload>,
  copyPayload: (payload: TPayload) => TCopy
): SyncConfigurationEntity<TCopy> => ({
  id: entity.id,
  payload: entity.payload === null ? null : copyPayload(entity.payload),
  mutationId: entity.mutationId,
  modifiedBy: entity.modifiedBy,
  modifiedAt: entity.modifiedAt,
  deletedAt: entity.deletedAt,
})
