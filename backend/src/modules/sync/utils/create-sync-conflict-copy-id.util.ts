import { createHash } from 'node:crypto'
import { v4 as uuidV4 } from 'uuid'
import type { SyncMergeConflict } from '../types/sync-merge-conflict'
import { stableStringify } from './stable-stringify.util'

export const createSyncConflictCopyId = (
  workspaceId: string,
  conflict: SyncMergeConflict
): string => {
  const sideHashes = [
    conflict.localDocument && 'contentHash' in conflict.localDocument
      ? conflict.localDocument.contentHash
      : null,
    conflict.remoteDocument && 'contentHash' in conflict.remoteDocument
      ? conflict.remoteDocument.contentHash
      : null,
  ].sort()
  const digest = createHash('sha256')
    .update(
      stableStringify({
        workspaceId,
        entityKind: conflict.entityKind,
        entityId: conflict.entityId,
        conflictType: conflict.conflictType,
        fieldPaths: [...conflict.fieldPaths].sort(),
        baseHash:
          conflict.baseDocument && 'contentHash' in conflict.baseDocument
            ? conflict.baseDocument.contentHash
            : null,
        sideHashes,
      })
    )
    .digest()

  return uuidV4({ random: digest.subarray(0, 16) })
}
