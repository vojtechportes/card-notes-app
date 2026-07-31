import type { SyncConfigurationEntity } from '../types/sync-configuration-entity'
import { isIsoDate } from './is-iso-date.util'
import { isRecord } from './is-record.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isSyncConfigurationEntityValid = <TPayload>(
  value: unknown,
  isPayloadValid: (payload: unknown) => payload is TPayload
): value is SyncConfigurationEntity<TPayload> => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isUuidV4(value.id) &&
    isUuidV4(value.mutationId) &&
    isUuidV4(value.modifiedBy) &&
    isIsoDate(value.modifiedAt) &&
    (value.deletedAt === null || isIsoDate(value.deletedAt)) &&
    (value.deletedAt === null
      ? isPayloadValid(value.payload)
      : value.payload === null)
  )
}
