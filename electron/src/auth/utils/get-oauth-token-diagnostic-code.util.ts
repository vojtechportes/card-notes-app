import type { OAuthDiagnosticCode } from '../types/oauth-diagnostic-code.js'
import type { OAuthTokenOperation } from '../types/oauth-token-operation.js'

type OAuthTokenFailureReason =
  | 'access-denied'
  | 'invalid-client'
  | 'invalid-grant'
  | 'invalid-request'
  | 'invalid-scope'
  | 'provider-rejected'
  | 'unauthorized-client'
  | 'unsupported-grant-type'

type OAuthProviderErrorCode =
  | 'access_denied'
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_request'
  | 'invalid_scope'
  | 'unauthorized_client'
  | 'unsupported_grant_type'

const reasonByProviderError: Record<
  OAuthProviderErrorCode,
  OAuthTokenFailureReason
> = {
  access_denied: 'access-denied',
  invalid_client: 'invalid-client',
  invalid_grant: 'invalid-grant',
  invalid_request: 'invalid-request',
  invalid_scope: 'invalid-scope',
  unauthorized_client: 'unauthorized-client',
  unsupported_grant_type: 'unsupported-grant-type',
}

export const getOAuthTokenDiagnosticCode = (
  operation: OAuthTokenOperation,
  providerError: string | null
): OAuthDiagnosticCode => {
  const reason = Object.hasOwn(reasonByProviderError, providerError ?? '')
    ? reasonByProviderError[providerError as OAuthProviderErrorCode]
    : 'provider-rejected'

  return `oauth-${operation}-exchange-${reason}`
}
