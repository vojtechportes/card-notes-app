import { randomBytes } from 'node:crypto'
import { SYNC_FORMAT_VERSION } from '../constants/sync-format-version'
import type { MappedSyncDocument } from '../types/mapped-sync-document'
import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { generateNotificationAuthKey } from './generate-notification-auth-key.util'
import { mapSyncDocument } from './map-sync-document.util'

export const createWorkspaceSyncDocument = (
  workspaceId: string,
  deviceId: string,
  createdAt = new Date().toISOString()
): MappedSyncDocument<SyncRemoteDocument> => {
  return mapSyncDocument({
    formatVersion: SYNC_FORMAT_VERSION,
    workspaceId,
    createdAt,
    createdByDeviceId: deviceId,
    notificationRouting: {
      workspaceRouteId: randomBytes(16).toString('base64url'),
      notificationAuthKey: generateNotificationAuthKey(),
      secretVersion: 1,
    },
  })
}
