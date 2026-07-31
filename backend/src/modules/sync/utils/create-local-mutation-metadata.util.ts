import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'

export interface LocalMutationMetadata {
  mutationId: string
  modifiedByDeviceId: string
  modifiedAt: string
}

export const createLocalMutationMetadata = (
  database: Database,
  modifiedAt = new Date().toISOString()
): LocalMutationMetadata => {
  const identity = database
    .prepare('SELECT device_id FROM sync_identity WHERE id = 1')
    .get() as { device_id: string } | undefined

  if (!identity) {
    throw new Error('Synchronization identity is not initialized.')
  }

  return {
    mutationId: uuidV4(),
    modifiedByDeviceId: identity.device_id,
    modifiedAt,
  }
}
