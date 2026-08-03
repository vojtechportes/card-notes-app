import type { OAuthAccount } from '../types/oauth-account.js'
import type { OAuthIdTokenClaims } from '../types/oauth-id-token-claims.js'
import type { OAuthProviderEnum } from '../types/oauth-provider-enum.js'

export const mapOAuthAccount = (
  provider: OAuthProviderEnum,
  claims: OAuthIdTokenClaims
): OAuthAccount => {
  return {
    accountId: claims.oid ?? claims.sub,
    displayName:
      claims.name ?? claims.preferred_username ?? claims.email ?? null,
    provider,
    tenantId: claims.tid ?? null,
  }
}
