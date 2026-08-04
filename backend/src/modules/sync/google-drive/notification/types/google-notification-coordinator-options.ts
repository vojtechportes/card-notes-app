import type { GoogleNotificationContext } from './google-notification-context'
import type { GoogleRelayClient } from '../google-relay.client'
import type { GoogleWatchService } from '../google-watch.service'

export interface GoogleNotificationCoordinatorOptions {
  fallbackIntervalMs?: number
  observeIntervalMs?: number
  reconnectMaximumMs?: number
  relayBaseUrl?: string
  renewalWindowMs?: number
  now?: () => number
  random?: () => number
  createRelayClient?: (context: GoogleNotificationContext) => GoogleRelayClient
  createWatchService?: () => GoogleWatchService
}
