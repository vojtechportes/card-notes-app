import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from '../types/sync-mutation-intent-enum'
import type { SyncMutation } from '../types/sync-mutation'
import { isIsoDate } from './is-iso-date.util'
import { isRecord } from './is-record.util'
import { isSha256Hash } from './is-sha-256-hash.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isSyncMutationValid = (value: unknown): value is SyncMutation => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isUuidV4(value.mutationId) &&
    isUuidV4(value.workspaceId) &&
    Object.values(SyncEntityKindEnum).includes(
      value.entityKind as SyncEntityKindEnum
    ) &&
    typeof value.entityId === 'string' &&
    value.entityId.length > 0 &&
    Object.values(SyncMutationIntentEnum).includes(
      value.intent as SyncMutationIntentEnum
    ) &&
    (value.baseHash === null || isSha256Hash(value.baseHash)) &&
    isSha256Hash(value.targetHash) &&
    isUuidV4(value.originatingDeviceId) &&
    isIsoDate(value.createdAt)
  )
}
