import type { NotificationRouting } from '../../../types/notification-routing'
import type { GoogleNotificationMetadata } from './google-notification-metadata'

export interface GoogleNotificationContext {
  workspaceId: string
  deviceId: string
  cursor: string
  routing: NotificationRouting
  metadata: GoogleNotificationMetadata | null
}
