import { syncLogicalKeys } from '../../constants/sync-logical-keys'
import { SyncEntityKindEnum } from '../../types/sync-entity-kind-enum'

export const getOneDriveEntityKind = (
  logicalKey: string
): SyncEntityKindEnum | null => {
  if (logicalKey === syncLogicalKeys.workspace) {
    return SyncEntityKindEnum.Workspace
  }
  if (logicalKey === syncLogicalKeys.configuration) {
    return SyncEntityKindEnum.Configuration
  }
  if (logicalKey.startsWith('notes/') && logicalKey.endsWith('.json')) {
    return SyncEntityKindEnum.Note
  }
  if (logicalKey.startsWith('assets/')) {
    return SyncEntityKindEnum.Asset
  }

  return null
}
