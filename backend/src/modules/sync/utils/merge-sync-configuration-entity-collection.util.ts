import type { SyncConfigurationCollectionMergeResult } from '../types/sync-configuration-collection-merge-result'
import type { SyncConfigurationEntity } from '../types/sync-configuration-entity'
import { mergeSyncConfigurationEntity } from './merge-sync-configuration-entity.util'

export const mergeSyncConfigurationEntityCollection = <TPayload extends object>(
  base: Array<SyncConfigurationEntity<TPayload>>,
  local: Array<SyncConfigurationEntity<TPayload>>,
  remote: Array<SyncConfigurationEntity<TPayload>>,
  path: string
): SyncConfigurationCollectionMergeResult<TPayload> => {
  const baseById = new Map(base.map((entity) => [entity.id, entity]))
  const localById = new Map(local.map((entity) => [entity.id, entity]))
  const remoteById = new Map(remote.map((entity) => [entity.id, entity]))
  const ids = new Set([
    ...baseById.keys(),
    ...localById.keys(),
    ...remoteById.keys(),
  ])
  const entities: Array<SyncConfigurationEntity<TPayload>> = []
  const conflicts: SyncConfigurationCollectionMergeResult<TPayload>['conflicts'] =
    []

  for (const id of [...ids].sort()) {
    const result = mergeSyncConfigurationEntity(
      baseById.get(id) ?? null,
      localById.get(id) ?? null,
      remoteById.get(id) ?? null,
      `${path}.${id}`
    )

    if (result.entity) {
      entities.push(result.entity)
    }
    if (result.conflictType) {
      conflicts.push({
        conflictType: result.conflictType,
        fieldPaths: result.fieldPaths,
      })
    }
  }

  return { entities, conflicts }
}
