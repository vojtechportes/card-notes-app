import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

const GRAPH_HOSTNAME = 'graph.microsoft.com'
const GRAPH_PATH_PREFIX = '/v1.0/me/drive/'

export const assertOneDriveGraphUrl = (value: string): string => {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive returned an invalid continuation URL.'
    )
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== GRAPH_HOSTNAME ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    !url.pathname.startsWith(GRAPH_PATH_PREFIX)
  ) {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive returned an untrusted continuation URL.'
    )
  }

  return url.toString()
}
