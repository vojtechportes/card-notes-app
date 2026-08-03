import type { GoogleDriveEnumerationPageToken } from '../types/google-drive-enumeration-page-token'
import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

export const decodeGoogleDriveEnumerationPageToken = (
  token: string
): GoogleDriveEnumerationPageToken => {
  try {
    const value = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8')
    ) as Partial<GoogleDriveEnumerationPageToken>

    if (
      typeof value.candidateCursor !== 'string' ||
      typeof value.providerPageToken !== 'string'
    ) {
      throw new Error('Invalid page token shape.')
    }

    return {
      candidateCursor: value.candidateCursor,
      providerPageToken: value.providerPageToken,
    }
  } catch {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'The Google Drive enumeration page token is invalid.'
    )
  }
}
