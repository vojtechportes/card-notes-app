import type { OAuthIdTokenClaims } from '../types/oauth-id-token-claims.js'

export const parseOAuthIdToken = (idToken: string): OAuthIdTokenClaims => {
  const parts = idToken.split('.')

  if (parts.length !== 3) {
    throw new Error('oauth-invalid-id-token')
  }

  try {
    return JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    ) as OAuthIdTokenClaims
  } catch {
    throw new Error('oauth-invalid-id-token')
  }
}
