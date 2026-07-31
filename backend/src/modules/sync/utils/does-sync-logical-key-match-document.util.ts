import { syncLogicalKeys } from '../constants/sync-logical-keys'
import type { SyncRemoteDocument } from '../types/sync-remote-document'

export const doesSyncLogicalKeyMatchDocument = (
  logicalKey: string,
  document: SyncRemoteDocument
): boolean => {
  if (!('entityType' in document)) {
    return logicalKey === syncLogicalKeys.workspace
  }

  if (document.entityType === 'configuration') {
    return logicalKey === syncLogicalKeys.configuration
  }

  return logicalKey === syncLogicalKeys.note(document.entityId)
}
