import type { Database } from 'better-sqlite3'
import { syncLogicalKeys } from '../constants/sync-logical-keys'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'

export const getSyncLogicalKey = (
  database: Database,
  entityKind: SyncEntityKindEnum,
  entityId: string
): string => {
  switch (entityKind) {
    case SyncEntityKindEnum.Note:
      return syncLogicalKeys.note(entityId)
    case SyncEntityKindEnum.Configuration:
      return syncLogicalKeys.configuration
    case SyncEntityKindEnum.Asset: {
      const asset = database
        .prepare('SELECT extension FROM assets WHERE asset_id = ?')
        .get(entityId) as { extension: string }

      return syncLogicalKeys.asset(entityId, asset.extension)
    }
    default:
      return syncLogicalKeys.workspace
  }
}
