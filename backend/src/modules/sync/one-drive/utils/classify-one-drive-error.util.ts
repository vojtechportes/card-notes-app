import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

const quotaCodes = new Set([
  'quotaLimitReached',
  'storageLimitReached',
  'activityLimitReached',
])
const invalidCursorCodes = new Set([
  'resyncRequired',
  'syncStateNotFound',
  'invalidDeltaToken',
])

export const classifyOneDriveError = (
  status: number,
  code: string | undefined,
  isDeltaRequest: boolean
): SyncProviderErrorKindEnum => {
  if (status === 401 || status === 403) {
    return SyncProviderErrorKindEnum.Authentication
  }
  if (
    status === 410 ||
    (isDeltaRequest && code !== undefined && invalidCursorCodes.has(code))
  ) {
    return SyncProviderErrorKindEnum.InvalidCursor
  }
  if (status === 404) {
    return SyncProviderErrorKindEnum.NotFound
  }
  if (status === 409 || status === 412) {
    return SyncProviderErrorKindEnum.PreconditionFailed
  }
  if (status === 429 || code === 'throttledRequest') {
    return SyncProviderErrorKindEnum.Throttled
  }
  if (code !== undefined && quotaCodes.has(code)) {
    return SyncProviderErrorKindEnum.Quota
  }
  if (status === 408 || status >= 500) {
    return SyncProviderErrorKindEnum.Transient
  }

  return SyncProviderErrorKindEnum.Permanent
}
