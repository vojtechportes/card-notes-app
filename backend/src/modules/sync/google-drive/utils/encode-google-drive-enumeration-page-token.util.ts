import type { GoogleDriveEnumerationPageToken } from '../types/google-drive-enumeration-page-token'

export const encodeGoogleDriveEnumerationPageToken = (
  value: GoogleDriveEnumerationPageToken
): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
