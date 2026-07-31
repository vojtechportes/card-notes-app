import { randomBytes } from 'node:crypto'
import { NOTIFICATION_AUTH_KEY_BYTE_LENGTH } from '../constants/notification-auth-key-byte-length'

export const generateNotificationAuthKey = (): string =>
  randomBytes(NOTIFICATION_AUTH_KEY_BYTE_LENGTH).toString('base64url')
