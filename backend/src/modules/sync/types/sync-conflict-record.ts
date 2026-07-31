import type { SyncConflictResolutionStateEnum } from './sync-conflict-resolution-state-enum'
import type { SyncConflictTypeEnum } from './sync-conflict-type-enum'
import type { SyncEntityKindEnum } from './sync-entity-kind-enum'

export interface SyncConflictRecord {
  id: string
  workspaceId: string
  entityKind: SyncEntityKindEnum
  entityId: string | null
  conflictType: SyncConflictTypeEnum
  fieldPaths: string[]
  baseHash: string | null
  localHash: string | null
  remoteHash: string | null
  baseDocumentJson: string | null
  localDocumentJson: string | null
  remoteDocumentJson: string | null
  resolutionState: SyncConflictResolutionStateEnum
  conflictCopyEntityId: string | null
  createdAt: string
  resolvedAt: string | null
}
