import type { GoogleDriveFile } from '../types/google-drive-file'
import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

export const getGoogleDriveProviderVersion = (
  response: Response,
  file: GoogleDriveFile
): string => {
  const etag = response.headers.get('etag')
  if (etag) {
    return etag
  }

  if (file.version) {
    return `version:${file.version}`
  }

  throw new SyncProviderError(
    SyncProviderErrorKindEnum.Permanent,
    'Google Drive did not return remote version metadata.'
  )
}
