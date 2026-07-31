import type { SyncProviderErrorKindEnum } from './sync-provider-error-kind-enum'

export class SyncProviderError extends Error {
  constructor(
    public readonly kind: SyncProviderErrorKindEnum,
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(message)
    this.name = 'SyncProviderError'
  }
}
