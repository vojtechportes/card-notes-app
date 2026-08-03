import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

export const readGoogleDriveJson = async <Value>(
  response: Response
): Promise<Value> => {
  try {
    return (await response.json()) as Value
  } catch {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'Google Drive returned an invalid JSON response.'
    )
  }
}
