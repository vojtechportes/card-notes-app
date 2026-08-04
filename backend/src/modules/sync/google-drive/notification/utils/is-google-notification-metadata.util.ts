import type { GoogleNotificationMetadata } from '../types/google-notification-metadata'

export const isGoogleNotificationMetadata = (
  value: unknown
): value is GoogleNotificationMetadata => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const metadata = value as Record<string, unknown>

  return (
    (metadata.channelId === null ||
      (typeof metadata.channelId === 'string' &&
        metadata.channelId.length > 0)) &&
    (metadata.resourceId === null ||
      (typeof metadata.resourceId === 'string' &&
        metadata.resourceId.length > 0)) &&
    typeof metadata.expiresAt === 'number' &&
    Number.isFinite(metadata.expiresAt) &&
    typeof metadata.relayChannelExpiresAt === 'number' &&
    Number.isFinite(metadata.relayChannelExpiresAt) &&
    (metadata.relayConnectedAt === null ||
      typeof metadata.relayConnectedAt === 'string')
  )
}
