import { NOTIFICATION_AUTH_KEY_BYTE_LENGTH } from '../constants/notification-auth-key-byte-length'

export const isNotificationAuthKeyValid = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return false
  }

  const decoded = Buffer.from(value, 'base64url')

  return (
    decoded.length === NOTIFICATION_AUTH_KEY_BYTE_LENGTH &&
    decoded.toString('base64url') === value
  )
}
