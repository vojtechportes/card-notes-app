import type { SyncConflictTypeEnum } from './sync-conflict-type-enum'
import type { SyncEntityKindEnum } from './sync-entity-kind-enum'
import type { SyncRemoteDocument } from './sync-remote-document'

export interface SyncMergeConflict {
  conflictType: SyncConflictTypeEnum
  entityKind: SyncEntityKindEnum
  entityId: string
  fieldPaths: string[]
  baseDocument: SyncRemoteDocument | null
  localDocument: SyncRemoteDocument | null
  remoteDocument: SyncRemoteDocument | null
  conflictCopyDocument?: SyncRemoteDocument
}
