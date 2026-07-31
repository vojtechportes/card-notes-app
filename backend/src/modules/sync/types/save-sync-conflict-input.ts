import type { SyncMergeConflict } from './sync-merge-conflict'

export interface SaveSyncConflictInput {
  workspaceId: string
  conflict: SyncMergeConflict
  conflictCopyEntityId?: string
}
