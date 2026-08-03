import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'

const throttlingReasons = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'sharingRateLimitExceeded',
])
const quotaReasons = new Set([
  'dailyLimitExceeded',
  'storageQuotaExceeded',
  'activeItemCreationLimitExceeded',
])
const invalidCursorReasons = new Set(['invalidPageToken', 'pageTokenExpired'])

export const classifyGoogleDriveError = (
  status: number,
  reasons: string[],
  isChangeCursorRequest: boolean
): SyncProviderErrorKindEnum => {
  if (status === 401) {
    return SyncProviderErrorKindEnum.Authentication
  }
  if (status === 404) {
    return SyncProviderErrorKindEnum.NotFound
  }
  if (status === 409 || status === 412) {
    return SyncProviderErrorKindEnum.PreconditionFailed
  }
  if (
    status === 410 ||
    (isChangeCursorRequest &&
      reasons.some((reason) => invalidCursorReasons.has(reason)))
  ) {
    return SyncProviderErrorKindEnum.InvalidCursor
  }
  if (
    status === 429 ||
    reasons.some((reason) => throttlingReasons.has(reason))
  ) {
    return SyncProviderErrorKindEnum.Throttled
  }
  if (reasons.some((reason) => quotaReasons.has(reason))) {
    return SyncProviderErrorKindEnum.Quota
  }
  if (status === 408 || status >= 500) {
    return SyncProviderErrorKindEnum.Transient
  }

  return SyncProviderErrorKindEnum.Permanent
}
