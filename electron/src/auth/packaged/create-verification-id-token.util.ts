import { sign, type KeyObject } from 'node:crypto'
import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'

export const createVerificationIdToken = (
  configuration: OAuthProviderConfiguration,
  nonce: string,
  privateKey: KeyObject
): string => {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: 'packaged-verification-key' })
  ).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      aud: configuration.clientId,
      exp: Math.floor(Date.now() / 1000) + 300,
      iss: configuration.issuerPrefixes[0],
      nonce,
      oid:
        configuration.provider === OAuthProviderEnum.OneDrive
          ? 'packaged-account'
          : undefined,
      sub: 'packaged-account',
      tid:
        configuration.provider === OAuthProviderEnum.OneDrive
          ? 'packaged-tenant'
          : undefined,
    })
  ).toString('base64url')
  const unsignedToken = `${header}.${payload}`
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(unsignedToken),
    privateKey
  ).toString('base64url')

  return `${unsignedToken}.${signature}`
}
