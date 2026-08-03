import { syncLogicalKeys } from '../constants/sync-logical-keys'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'

export const getSyncEntityIdFromLogicalKey = (
  logicalKey: string,
  entityKind: SyncEntityKindEnum
): string => {
  if (entityKind === SyncEntityKindEnum.Configuration) {
    return 'configuration'
  }

  if (
    entityKind === SyncEntityKindEnum.Note &&
    logicalKey.startsWith('notes/') &&
    logicalKey.endsWith('.json')
  ) {
    return logicalKey.slice('notes/'.length, -'.json'.length)
  }

  if (logicalKey === syncLogicalKeys.workspace) {
    return 'workspace'
  }

  throw new Error(`Cannot resolve an entity ID from ${logicalKey}.`)
}
