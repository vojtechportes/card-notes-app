import { createPublicKey, verify } from 'node:crypto'
import type { OAuthFetch } from '../types/oauth-fetch.js'
import type { OAuthIdTokenHeader } from '../types/oauth-id-token-header.js'
import type { OAuthJsonWebKeySet } from '../types/oauth-json-web-key-set.js'
import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'

export const verifyOAuthIdTokenSignature = async (
  idToken: string,
  configuration: OAuthProviderConfiguration,
  fetchImplementation: OAuthFetch
): Promise<void> => {
  const parts = idToken.split('.')

  if (parts.length !== 3) {
    throw new Error('oauth-invalid-id-token')
  }

  let header: OAuthIdTokenHeader

  try {
    header = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as OAuthIdTokenHeader
  } catch {
    throw new Error('oauth-invalid-id-token')
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('oauth-invalid-id-token')
  }

  let response: Response

  try {
    response = await fetchImplementation(configuration.jwksEndpoint, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new Error('oauth-invalid-id-token')
  }

  if (!response.ok) {
    throw new Error('oauth-invalid-id-token')
  }

  let keySet: OAuthJsonWebKeySet

  try {
    keySet = (await response.json()) as OAuthJsonWebKeySet
  } catch {
    throw new Error('oauth-invalid-id-token')
  }

  const signingKey = keySet.keys?.find(
    (key) =>
      key.kid === header.kid &&
      key.kty === 'RSA' &&
      (!key.alg || key.alg === 'RS256') &&
      (!key.use || key.use === 'sig')
  )

  if (!signingKey) {
    throw new Error('oauth-invalid-id-token')
  }

  try {
    const publicKey = createPublicKey({ format: 'jwk', key: signingKey })
    const isValid = verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url')
    )

    if (!isValid) {
      throw new Error('oauth-invalid-id-token')
    }
  } catch {
    throw new Error('oauth-invalid-id-token')
  }
}
