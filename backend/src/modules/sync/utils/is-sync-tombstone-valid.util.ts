import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import type { SyncTombstone } from '../types/sync-tombstone'
import { isIsoDate } from './is-iso-date.util'
import { isRecord } from './is-record.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isSyncTombstoneValid = (
  value: unknown
): value is SyncTombstone => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isUuidV4(value.workspaceId) &&
    Object.values(SyncEntityKindEnum).includes(
      value.entityKind as SyncEntityKindEnum
    ) &&
    typeof value.entityId === 'string' &&
    value.entityId.length > 0 &&
    isUuidV4(value.deletionMutationId) &&
    isUuidV4(value.deletionDeviceId) &&
    isIsoDate(value.deletedAt)
  )
}
