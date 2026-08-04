import type { SyncConflictResolutionStateEnum } from './sync-conflict-resolution-state-enum'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface ResolveSyncConflictInput {
  conflictId: string
  resolutionState: Exclude<
    SyncConflictResolutionStateEnum,
    SyncConflictResolutionStateEnum.Unresolved
  >
  mergedDocument?: SyncRemoteDocument
  retainBoth?: boolean
}
