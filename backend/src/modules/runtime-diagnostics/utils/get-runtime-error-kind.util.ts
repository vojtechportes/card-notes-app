import { HttpException } from '@nestjs/common'

export const getRuntimeErrorKind = (error: unknown): string => {
  if (error instanceof HttpException) {
    return 'http-exception'
  }

  if (!(error instanceof Error)) {
    return 'unknown'
  }

  switch (error.name) {
    case 'AbortError':
      return 'aborted'
    case 'RangeError':
      return 'range-error'
    case 'SyntaxError':
      return 'syntax-error'
    case 'SyncProviderError':
      return 'sync-provider-error'
    case 'SyncProviderUnavailableError':
      return 'sync-provider-unavailable'
    case 'TimeoutError':
      return 'timeout'
    case 'TypeError':
      return 'type-error'
    default:
      return 'internal-error'
  }
}
