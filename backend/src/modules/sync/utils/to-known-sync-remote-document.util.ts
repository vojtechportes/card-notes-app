import type { SyncRemoteDocument } from '../types/sync-remote-document'
import type { WorkspaceDocument } from '../types/workspace-document'
import { copySyncConfigurationEntity } from './copy-sync-configuration-entity.util'
import { copySyncDocumentMetadata } from './copy-sync-document-metadata.util'
import { copySyncNoteValue } from './copy-sync-note-value.util'

export const toKnownSyncRemoteDocument = (
  document: SyncRemoteDocument
): SyncRemoteDocument => {
  if (!('entityType' in document)) {
    const workspace = document as WorkspaceDocument

    return {
      formatVersion: workspace.formatVersion,
      workspaceId: workspace.workspaceId,
      createdAt: workspace.createdAt,
      createdByDeviceId: workspace.createdByDeviceId,
      notificationRouting: {
        workspaceRouteId: workspace.notificationRouting.workspaceRouteId,
        notificationAuthKey: workspace.notificationRouting.notificationAuthKey,
        secretVersion: workspace.notificationRouting.secretVersion,
      },
    }
  }

  if (document.entityType === 'note') {
    const values = Object.fromEntries(
      Object.entries(document.payload?.values ?? {}).map(
        ([columnId, value]) => [columnId, copySyncNoteValue(value)]
      )
    )

    return {
      ...copySyncDocumentMetadata(document),
      entityType: 'note',
      entityId: document.entityId,
      deletedAt: document.deletedAt,
      payload:
        document.payload === null
          ? null
          : {
              noteTypeId: document.payload.noteTypeId,
              background: document.payload.background,
              values,
            },
    }
  }

  return {
    ...copySyncDocumentMetadata(document),
    entityType: 'configuration',
    entityId: 'configuration',
    payload: {
      noteTypes: document.payload.noteTypes.map((entity) =>
        copySyncConfigurationEntity(entity, (payload) => ({
          title: payload.title,
          orderKey: payload.orderKey,
        }))
      ),
      columns: document.payload.columns.map((entity) =>
        copySyncConfigurationEntity(entity, (payload) => ({
          noteTypeId: payload.noteTypeId,
          name: payload.name,
          title: payload.title,
          type: payload.type,
          orderKey: payload.orderKey,
          isHidden: payload.isHidden,
          isHiddenInDetail: payload.isHiddenInDetail,
          isDefault: payload.isDefault,
          config: payload.config === null ? null : { ...payload.config },
        }))
      ),
      labels: document.payload.labels.map((entity) =>
        copySyncConfigurationEntity(entity, (payload) => ({
          title: payload.title,
          name: payload.name,
          color: payload.color,
          noteTypeId: payload.noteTypeId,
        }))
      ),
      generalSettings: copySyncConfigurationEntity(
        document.payload.generalSettings,
        (payload) => ({
          textTruncationLength: payload.textTruncationLength,
          cardFieldDisplayCount: payload.cardFieldDisplayCount,
          mergeDateTimeFields: payload.mergeDateTimeFields,
        })
      ),
    },
  }
}
