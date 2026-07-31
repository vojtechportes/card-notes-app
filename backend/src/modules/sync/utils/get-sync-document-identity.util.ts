import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import type { SyncRemoteDocument } from '../types/sync-remote-document'

export const getSyncDocumentIdentity = (
  document: SyncRemoteDocument
): { entityKind: SyncEntityKindEnum; entityId: string } => {
  if (!('entityType' in document)) {
    return {
      entityKind: SyncEntityKindEnum.Workspace,
      entityId: document.workspaceId,
    }
  }

  if (document.entityType === 'configuration') {
    return {
      entityKind: SyncEntityKindEnum.Configuration,
      entityId: document.entityId,
    }
  }

  return { entityKind: SyncEntityKindEnum.Note, entityId: document.entityId }
}
