import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

export const readOneDriveJson = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T
  } catch {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'Microsoft Graph returned invalid JSON.'
    )
  }
}
