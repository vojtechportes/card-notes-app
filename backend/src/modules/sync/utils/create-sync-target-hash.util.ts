import type { Database } from 'better-sqlite3'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import { createAssetSyncTarget } from './create-asset-sync-target.util'
import { createConfigurationSyncTarget } from './create-configuration-sync-target.util'
import { createNoteSyncTarget } from './create-note-sync-target.util'
import { createSha256Hash } from './create-sha-256-hash.util'
import { stableStringify } from './stable-stringify.util'

export const createSyncTargetHash = (
  database: Database,
  entityKind: SyncEntityKindEnum,
  entityId: string
): string => {
  let target: unknown

  switch (entityKind) {
    case SyncEntityKindEnum.Note:
      target = createNoteSyncTarget(database, entityId)
      break
    case SyncEntityKindEnum.Configuration:
      target = createConfigurationSyncTarget(database)
      break
    case SyncEntityKindEnum.Asset:
      target = createAssetSyncTarget(database, entityId)
      break
    default:
      target = { workspaceId: entityId }
  }

  return createSha256Hash(stableStringify(target))
}
