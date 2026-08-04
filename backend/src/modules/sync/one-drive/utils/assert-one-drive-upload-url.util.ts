import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

const isAllowedUploadHost = (hostname: string): boolean =>
  hostname.endsWith('.up.1drv.com') || hostname.endsWith('.sharepoint.com')

export const assertOneDriveUploadUrl = (value: string): string => {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive returned an invalid upload session URL.'
    )
  }

  if (
    url.protocol !== 'https:' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    url.pathname === '/' ||
    !isAllowedUploadHost(url.hostname)
  ) {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive returned an untrusted upload session URL.'
    )
  }

  return url.toString()
}
