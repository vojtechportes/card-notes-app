import { createHash } from 'node:crypto'
import { v4 as uuidV4 } from 'uuid'

export const createSyncConflictCopyMutationId = (
  conflictCopyEntityId: string
): string => {
  const digest = createHash('sha256')
    .update(`conflict-copy-mutation:${conflictCopyEntityId}`)
    .digest()

  return uuidV4({ random: digest.subarray(0, 16) })
}
