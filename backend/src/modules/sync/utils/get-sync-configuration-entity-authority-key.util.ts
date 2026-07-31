import type { SyncConfigurationEntity } from '../types/sync-configuration-entity'
import { stableStringify } from './stable-stringify.util'

export const getSyncConfigurationEntityAuthorityKey = <TPayload>(
  entity: SyncConfigurationEntity<TPayload>
): string =>
  `${entity.mutationId}:${entity.modifiedBy}:${stableStringify(entity.payload)}`
