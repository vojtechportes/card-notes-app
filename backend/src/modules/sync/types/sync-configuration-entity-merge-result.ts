import type { SyncConfigurationEntity } from './sync-configuration-entity'
import type { SyncConflictTypeEnum } from './sync-conflict-type-enum'

export interface SyncConfigurationEntityMergeResult<TPayload> {
  entity: SyncConfigurationEntity<TPayload> | null
  conflictType: SyncConflictTypeEnum | null
  fieldPaths: string[]
}
