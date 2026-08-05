import type { OAuthDiagnosticCode } from '../types/oauth-diagnostic-code.js'

export class OAuthTokenRequestError extends Error {
  constructor(
    readonly publicErrorCode: 'oauth-reconnect-required' | 'oauth-unavailable',
    readonly diagnosticCode: OAuthDiagnosticCode
  ) {
    super(publicErrorCode)
    this.name = 'OAuthTokenRequestError'
  }
}
