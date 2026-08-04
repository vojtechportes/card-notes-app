export interface GoogleNotificationMetadata {
  channelId: string | null
  resourceId: string | null
  expiresAt: number
  relayChannelExpiresAt: number
  relayConnectedAt: string | null
}
