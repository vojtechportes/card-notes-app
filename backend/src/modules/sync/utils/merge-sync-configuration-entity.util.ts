import type { SyncConfigurationEntityMergeResult } from '../types/sync-configuration-entity-merge-result'
import type { SyncConfigurationEntity } from '../types/sync-configuration-entity'
import { SyncConflictTypeEnum } from '../types/sync-conflict-type-enum'
import { areSyncValuesEqual } from './are-sync-values-equal.util'
import { getSyncConfigurationEntityAuthorityKey } from './get-sync-configuration-entity-authority-key.util'
import { mergeThreeWayValue } from './merge-three-way-value.util'

export const mergeSyncConfigurationEntity = <TPayload extends object>(
  base: SyncConfigurationEntity<TPayload> | null,
  local: SyncConfigurationEntity<TPayload> | null,
  remote: SyncConfigurationEntity<TPayload> | null,
  path: string
): SyncConfigurationEntityMergeResult<TPayload> => {
  if (!local) {
    return { entity: remote, conflictType: null, fieldPaths: [] }
  }
  if (!remote) {
    return { entity: local, conflictType: null, fieldPaths: [] }
  }

  const preferLocal =
    getSyncConfigurationEntityAuthorityKey(local).localeCompare(
      getSyncConfigurationEntityAuthorityKey(remote)
    ) >= 0
  const preferred = preferLocal ? local : remote

  if (areSyncValuesEqual(local, remote)) {
    return { entity: preferred, conflictType: null, fieldPaths: [] }
  }

  if (!base) {
    return {
      entity: preferred,
      conflictType: SyncConflictTypeEnum.UuidCollision,
      fieldPaths: [path],
    }
  }

  if (!base.payload && (local.payload || remote.payload)) {
    let tombstone = base

    if (!local.payload) {
      tombstone = local
    } else if (!remote.payload) {
      tombstone = remote
    }

    return {
      entity: tombstone,
      conflictType: SyncConflictTypeEnum.EditDelete,
      fieldPaths: [path],
    }
  }
  if (areSyncValuesEqual(local, base)) {
    return { entity: remote, conflictType: null, fieldPaths: [] }
  }
  if (areSyncValuesEqual(remote, base)) {
    return { entity: local, conflictType: null, fieldPaths: [] }
  }

  if (!local.payload || !remote.payload) {
    if (!local.payload && !remote.payload) {
      return { entity: preferred, conflictType: null, fieldPaths: [] }
    }

    return {
      entity: local.payload ? remote : local,
      conflictType: SyncConflictTypeEnum.EditDelete,
      fieldPaths: [path],
    }
  }

  if (!base.payload) {
    return {
      entity: preferred,
      conflictType: SyncConflictTypeEnum.EditDelete,
      fieldPaths: [path],
    }
  }

  const payload = {} as TPayload
  const fieldPaths: string[] = []
  const keys = new Set([
    ...Object.keys(base.payload as Record<string, unknown>),
    ...Object.keys(local.payload as Record<string, unknown>),
    ...Object.keys(remote.payload as Record<string, unknown>),
  ])

  for (const key of [...keys].sort()) {
    const merged = mergeThreeWayValue(
      (base.payload as Record<string, unknown>)[key],
      (local.payload as Record<string, unknown>)[key],
      (remote.payload as Record<string, unknown>)[key],
      preferLocal
    )

    if (merged.value !== undefined) {
      payload[key as keyof TPayload] = merged.value as TPayload[keyof TPayload]
    }
    if (merged.hasConflict) {
      fieldPaths.push(`${path}.payload.${key}`)
    }
  }

  return {
    entity: { ...preferred, payload },
    conflictType: fieldPaths.length > 0 ? SyncConflictTypeEnum.EditEdit : null,
    fieldPaths,
  }
}
