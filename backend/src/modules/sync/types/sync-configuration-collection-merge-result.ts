import type { SyncConfigurationEntity } from './sync-configuration-entity'
import type { SyncConflictTypeEnum } from './sync-conflict-type-enum'

export interface SyncConfigurationCollectionConflict {
  conflictType: SyncConflictTypeEnum
  fieldPaths: string[]
}

export interface SyncConfigurationCollectionMergeResult<TPayload> {
  entities: Array<SyncConfigurationEntity<TPayload>>
  conflicts: SyncConfigurationCollectionConflict[]
}
