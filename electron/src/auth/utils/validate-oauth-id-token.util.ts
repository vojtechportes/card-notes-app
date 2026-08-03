import type { OAuthIdTokenClaims } from '../types/oauth-id-token-claims.js'
import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import { isStateValid } from './is-state-valid.util.js'

export const validateOAuthIdToken = (
  claims: OAuthIdTokenClaims,
  configuration: OAuthProviderConfiguration,
  expectedNonce: string,
  nowMs: number
): void => {
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const hasExpectedIssuer = configuration.issuerPrefixes.some((issuer) => {
    if (issuer.endsWith('/')) {
      return claims.iss.startsWith(issuer)
    }

    return claims.iss === issuer
  })

  if (
    !audiences.includes(configuration.clientId) ||
    !hasExpectedIssuer ||
    claims.exp * 1000 <= nowMs ||
    !claims.sub ||
    !claims.nonce ||
    !isStateValid(claims.nonce, expectedNonce)
  ) {
    throw new Error('oauth-invalid-id-token')
  }
}
