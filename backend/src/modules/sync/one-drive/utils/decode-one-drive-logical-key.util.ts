import { ONE_DRIVE_OBJECT_FILE_PREFIX } from '../constants/one-drive.constants'
import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

export const decodeOneDriveLogicalKey = (fileName: string): string | null => {
  if (!fileName.startsWith(ONE_DRIVE_OBJECT_FILE_PREFIX)) {
    return null
  }

  const encoded = fileName.slice(ONE_DRIVE_OBJECT_FILE_PREFIX.length)
  if (!encoded.endsWith('.notestack')) {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive returned malformed NoteStack object metadata.'
    )
  }

  try {
    const value = Buffer.from(
      encoded.slice(0, -'.notestack'.length),
      'base64url'
    ).toString('utf8')

    if (!value || encodeURIComponent(value).includes('%EF%BF%BD')) {
      throw new Error('Invalid logical key')
    }

    return value
  } catch {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive returned malformed NoteStack object metadata.'
    )
  }
}
