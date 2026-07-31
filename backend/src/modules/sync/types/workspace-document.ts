import type { SYNC_FORMAT_VERSION } from '../constants/sync-format-version'
import type { NotificationRouting } from './notification-routing'

export interface WorkspaceDocument {
  formatVersion: typeof SYNC_FORMAT_VERSION
  workspaceId: string
  createdAt: string
  createdByDeviceId: string
  notificationRouting: NotificationRouting
}
