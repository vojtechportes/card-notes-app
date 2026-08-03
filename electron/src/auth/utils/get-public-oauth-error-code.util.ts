const knownErrorCodes = new Set([
  'oauth-account-mismatch',
  'oauth-cancelled',
  'oauth-configuration-missing',
  'oauth-invalid-callback',
  'oauth-invalid-id-token',
  'oauth-provider-denied',
  'oauth-reconnect-required',
  'oauth-secure-storage-unavailable',
  'oauth-state-mismatch',
  'oauth-timeout',
])

export const getPublicOAuthErrorCode = (error: unknown): string => {
  if (error instanceof Error && knownErrorCodes.has(error.message)) {
    return error.message
  }

  return 'oauth-unavailable'
}
