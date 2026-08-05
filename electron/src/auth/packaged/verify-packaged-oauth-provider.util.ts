import { generateKeyPairSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SafeStorage } from 'electron'
import { startCredentialBrokerServer } from '../broker/start-credential-broker-server.js'
import { SecureCredentialStore } from '../credentials/secure-credential-store.js'
import { createOAuthLoopbackListener } from '../oauth/create-oauth-loopback-listener.js'
import { OAuthService } from '../oauth/oauth-service.js'
import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import { createVerificationIdToken } from './create-verification-id-token.util.js'

export const verifyPackagedOAuthProvider = async (
  provider: OAuthProviderEnum,
  dataRoot: string,
  safeStorage: SafeStorage
): Promise<void> => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })
  const configuration: OAuthProviderConfiguration = {
    authorizationEndpoint: 'https://verification.notestack/authorize',
    clientId: `packaged-${provider}-client`,
    clientSecret:
      provider === OAuthProviderEnum.GoogleDrive
        ? 'packaged-google-client-secret'
        : null,
    issuerPrefixes: ['https://verification.notestack'],
    jwksEndpoint: 'https://verification.notestack/jwks',
    provider,
    revocationEndpoint: 'https://verification.notestack/revoke',
    scopes:
      provider === OAuthProviderEnum.GoogleDrive
        ? ['openid', 'https://www.googleapis.com/auth/drive.appdata']
        : ['openid', 'offline_access', 'Files.ReadWrite.AppFolder'],
    tokenEndpoint: 'https://verification.notestack/token',
  }
  const publicJwk = {
    ...publicKey.export({ format: 'jwk' }),
    alg: 'RS256',
    kid: 'packaged-verification-key',
    use: 'sig',
  }
  const credentialStore = new SecureCredentialStore(dataRoot, safeStorage)
  let authorizationNonce = ''
  let verificationNow = Date.now()
  let sawAuthorizationClientSecret = false
  let sawPkceVerifier = false
  let sawRefreshClientSecret = false
  const service = new OAuthService({
    configurations: new Map([[provider, configuration]]),
    createLoopbackListener: createOAuthLoopbackListener,
    credentialStore,
    fetchImplementation: async (url, init) => {
      if (url.toString() === configuration.jwksEndpoint) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
        })
      }

      if (url.toString() === configuration.revocationEndpoint) {
        return new Response(null, { status: 200 })
      }

      const body = new URLSearchParams(init?.body?.toString())
      const hasExpectedClientSecret =
        body.get('client_secret') === configuration.clientSecret

      if (body.get('grant_type') === 'authorization_code') {
        sawAuthorizationClientSecret = hasExpectedClientSecret
        sawPkceVerifier = Boolean(body.get('code_verifier'))
      }

      if (body.get('grant_type') === 'refresh_token') {
        sawRefreshClientSecret = hasExpectedClientSecret
      }

      return new Response(
        JSON.stringify({
          access_token: `packaged-${provider}-access-token`,
          expires_in: 300,
          id_token: createVerificationIdToken(
            configuration,
            authorizationNonce,
            privateKey
          ),
          refresh_token: `packaged-${provider}-refresh-token`,
          token_type: 'Bearer',
        }),
        { status: 200 }
      )
    },
    now: () => verificationNow,
    openExternal: async (authorizationUrl) => {
      const url = new URL(authorizationUrl)
      const callbackUrl = new URL(url.searchParams.get('redirect_uri')!)
      authorizationNonce = url.searchParams.get('nonce') ?? ''
      callbackUrl.searchParams.set('code', 'packaged-verification-code')
      callbackUrl.searchParams.set('state', url.searchParams.get('state') ?? '')

      const callbackResponse = await fetch(callbackUrl)

      if (!callbackResponse.ok) {
        throw new Error('packaged-oauth-callback-failed')
      }
    },
  })

  const state = await service.connect({ provider })

  verificationNow += 600_000
  await service.getAccessCredential(provider)

  if (
    state.status !== 'connected' ||
    !sawAuthorizationClientSecret ||
    !sawPkceVerifier ||
    !sawRefreshClientSecret
  ) {
    throw new Error('packaged-oauth-connect-failed')
  }

  const credentialBytes = readFileSync(
    path.join(dataRoot, 'oauth-credentials.enc'),
    'utf8'
  )

  if (credentialBytes.includes('refresh-token')) {
    throw new Error('packaged-oauth-storage-was-not-encrypted')
  }

  const broker = await startCredentialBrokerServer({ oauthService: service })

  try {
    const response = await fetch(
      `${broker.bootstrap.baseUrl}/v1/access-token`,
      {
        body: JSON.stringify({
          provider,
          requestId: `packaged-${provider}-request-id`,
        }),
        headers: {
          Authorization: `Bearer ${broker.bootstrap.authorization}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      }
    )

    if (!response.ok) {
      throw new Error('packaged-oauth-broker-failed')
    }

    const body = (await response.json()) as { accessToken?: string }

    if (body.accessToken !== `packaged-${provider}-access-token`) {
      throw new Error('packaged-oauth-broker-failed')
    }
  } finally {
    await broker.dispose()
    await service.disconnect(provider)
    service.dispose()
  }
}
