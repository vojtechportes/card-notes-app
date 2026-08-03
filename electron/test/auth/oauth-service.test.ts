import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import test from 'node:test'
import { OAuthService } from '../../src/auth/oauth/oauth-service'
import type { CredentialStore } from '../../src/auth/types/credential-store'
import type { OAuthLoopbackListener } from '../../src/auth/types/oauth-loopback-listener'
import type { OAuthProviderConfiguration } from '../../src/auth/types/oauth-provider-configuration'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'
import type { StoredOAuthCredential } from '../../src/auth/types/stored-oauth-credential'

const now = Date.parse('2026-08-03T10:00:00.000Z')
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})
const publicJwk = {
  ...publicKey.export({ format: 'jwk' }),
  alg: 'RS256',
  kid: 'test-signing-key',
  use: 'sig',
}

const createIdToken = (
  configuration: OAuthProviderConfiguration,
  nonce: string,
  accountId = 'account-1'
): string => {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: 'test-signing-key', typ: 'JWT' })
  ).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      aud: configuration.clientId,
      exp: Math.floor(now / 1000) + 3600,
      iss: configuration.issuerPrefixes[0],
      name: 'Test Person',
      nonce,
      oid:
        configuration.provider === OAuthProviderEnum.OneDrive
          ? accountId
          : undefined,
      sub: accountId,
      tid:
        configuration.provider === OAuthProviderEnum.OneDrive
          ? 'tenant-1'
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

const configurations = new Map<OAuthProviderEnum, OAuthProviderConfiguration>([
  [
    OAuthProviderEnum.GoogleDrive,
    {
      authorizationEndpoint: 'https://accounts.example/authorize',
      clientId: 'google-client',
      issuerPrefixes: ['https://accounts.example'],
      jwksEndpoint: 'https://accounts.example/jwks',
      provider: OAuthProviderEnum.GoogleDrive,
      revocationEndpoint: 'https://accounts.example/revoke',
      scopes: ['openid', 'offline', 'drive.appdata'],
      tokenEndpoint: 'https://accounts.example/token',
    },
  ],
  [
    OAuthProviderEnum.OneDrive,
    {
      authorizationEndpoint: 'https://microsoft.example/authorize',
      clientId: 'microsoft-client',
      issuerPrefixes: ['https://microsoft.example/tenant'],
      jwksEndpoint: 'https://microsoft.example/jwks',
      provider: OAuthProviderEnum.OneDrive,
      revocationEndpoint: null,
      scopes: ['openid', 'offline_access', 'Files.ReadWrite.AppFolder'],
      tokenEndpoint: 'https://microsoft.example/token',
    },
  ],
])

class MemoryCredentialStore implements CredentialStore {
  readonly credentials = new Map<OAuthProviderEnum, StoredOAuthCredential>()

  delete(provider: OAuthProviderEnum): void {
    this.credentials.delete(provider)
  }

  load(provider: OAuthProviderEnum): StoredOAuthCredential | null {
    return this.credentials.get(provider) ?? null
  }

  save(provider: OAuthProviderEnum, credential: StoredOAuthCredential): void {
    this.credentials.set(provider, credential)
  }
}

for (const provider of Object.values(OAuthProviderEnum)) {
  test(`${provider} connects through system-browser PKCE with a signed identity`, async () => {
    const credentialStore = new MemoryCredentialStore()
    let authorizationUrl = ''
    let tokenBody = ''
    const configuration = configurations.get(provider)!
    const service = new OAuthService({
      configurations,
      createLoopbackListener: async () => ({
        cancel: () => undefined,
        redirectUri: `http://127.0.0.1:32123/oauth/callback/${provider}`,
        result: Promise.resolve({ code: 'callback-secret-code' }),
      }),
      credentialStore,
      fetchImplementation: async (url, init) => {
        if (url.toString() === configuration.jwksEndpoint) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), {
            status: 200,
          })
        }

        tokenBody = init?.body?.toString() ?? ''
        const nonce = new URL(authorizationUrl).searchParams.get('nonce')!

        return new Response(
          JSON.stringify({
            access_token: 'short-lived-access-token',
            expires_in: 3600,
            id_token: createIdToken(configuration, nonce),
            refresh_token: 'long-lived-refresh-token',
            token_type: 'Bearer',
          }),
          { status: 200 }
        )
      },
      now: () => now,
      openExternal: async (url) => {
        authorizationUrl = url
      },
    })

    assert.equal(credentialStore.credentials.size, 0)
    assert.equal(service.getState().status, 'disconnected')

    const state = await service.connect({ provider })
    const parsedAuthorizationUrl = new URL(authorizationUrl)

    assert.equal(state.status, 'connected')
    assert.equal(state.account?.accountId, 'account-1')
    assert.equal(parsedAuthorizationUrl.hostname.endsWith('.example'), true)
    assert.equal(
      parsedAuthorizationUrl.searchParams.get('response_type'),
      'code'
    )
    assert.equal(
      parsedAuthorizationUrl.searchParams.get('code_challenge_method'),
      'S256'
    )
    assert.match(
      parsedAuthorizationUrl.searchParams.get('redirect_uri')!,
      /^http:\/\/127\.0\.0\.1:/
    )
    assert.equal(
      parsedAuthorizationUrl.searchParams
        .get('scope')
        ?.includes(
          provider === OAuthProviderEnum.GoogleDrive
            ? 'drive.appdata'
            : 'Files.ReadWrite.AppFolder'
        ),
      true
    )
    assert.match(tokenBody, /code_verifier=/)
    assert.doesNotMatch(tokenBody, /client_secret/)
    assert.equal(
      credentialStore.load(provider)?.refreshToken,
      'long-lived-refresh-token'
    )
    assert.doesNotMatch(
      JSON.stringify(state),
      /access-token|refresh-token|callback-secret/
    )
  })
}

test('rejects unsigned and forged ID tokens', async () => {
  const configuration = configurations.get(OAuthProviderEnum.GoogleDrive)!

  const validTokenParts = createIdToken(configuration, 'nonce').split('.')
  const forgedSignature = Buffer.from(validTokenParts[2], 'base64url')
  forgedSignature[0] ^= 0xff
  const forgedToken = `${validTokenParts[0]}.${validTokenParts[1]}.${forgedSignature.toString('base64url')}`

  for (const idToken of [
    `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from('{}').toString('base64url')}.`,
    forgedToken,
  ]) {
    let authorizationUrl = ''
    const service = new OAuthService({
      configurations,
      createLoopbackListener: async () => ({
        cancel: () => undefined,
        redirectUri: 'http://127.0.0.1:32123/oauth/callback/google-drive',
        result: Promise.resolve({ code: 'code' }),
      }),
      credentialStore: new MemoryCredentialStore(),
      fetchImplementation: async (url) => {
        if (url.toString() === configuration.jwksEndpoint) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), {
            status: 200,
          })
        }

        return new Response(
          JSON.stringify({
            access_token: 'access-token',
            expires_in: 3600,
            id_token: idToken,
            refresh_token: 'refresh-token',
            token_type: 'Bearer',
          }),
          { status: 200 }
        )
      },
      now: () => now,
      openExternal: async (url) => {
        authorizationUrl = url
      },
    })

    const state = await service.connect({
      provider: OAuthProviderEnum.GoogleDrive,
    })

    assert.ok(authorizationUrl)
    assert.equal(state.errorCode, 'oauth-invalid-id-token')
    assert.equal(state.status, 'disconnected')
  }
})

test('refresh rotates secure credentials and returns only a short-lived access token', async () => {
  const credentialStore = new MemoryCredentialStore()
  credentialStore.save(OAuthProviderEnum.GoogleDrive, {
    account: {
      accountId: 'account-1',
      displayName: null,
      provider: OAuthProviderEnum.GoogleDrive,
      tenantId: null,
    },
    refreshToken: 'old-refresh-token',
  })
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => {
      throw new Error('should-not-start-listener')
    },
    credentialStore,
    fetchImplementation: async () =>
      new Response(
        JSON.stringify({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'rotated-refresh-token',
          token_type: 'Bearer',
        }),
        { status: 200 }
      ),
    now: () => now,
    openExternal: async () => undefined,
  })

  const credential = await service.getAccessCredential(
    OAuthProviderEnum.GoogleDrive
  )

  assert.equal(credential.accessToken, 'new-access-token')
  assert.equal(
    credentialStore.load(OAuthProviderEnum.GoogleDrive)?.refreshToken,
    'rotated-refresh-token'
  )
})

test('reconnect blocks an unexpected account and preserves existing credentials', async () => {
  const credentialStore = new MemoryCredentialStore()
  const existingCredential: StoredOAuthCredential = {
    account: {
      accountId: 'expected-account',
      displayName: null,
      provider: OAuthProviderEnum.GoogleDrive,
      tenantId: null,
    },
    refreshToken: 'existing-refresh-token',
  }
  credentialStore.save(OAuthProviderEnum.GoogleDrive, existingCredential)
  let authorizationUrl = ''
  const configuration = configurations.get(OAuthProviderEnum.GoogleDrive)!
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => ({
      cancel: () => undefined,
      redirectUri: 'http://127.0.0.1:32123/oauth/callback/google-drive',
      result: Promise.resolve({ code: 'code' }),
    }),
    credentialStore,
    fetchImplementation: async (url) => {
      if (url.toString() === configuration.jwksEndpoint) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
        })
      }

      const nonce = new URL(authorizationUrl).searchParams.get('nonce')!

      return new Response(
        JSON.stringify({
          access_token: 'access-token',
          expires_in: 3600,
          id_token: createIdToken(configuration, nonce, 'wrong-account'),
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
        }),
        { status: 200 }
      )
    },
    now: () => now,
    openExternal: async (url) => {
      authorizationUrl = url
    },
  })

  const state = await service.reconnect({
    provider: OAuthProviderEnum.GoogleDrive,
  })

  assert.equal(state.errorCode, 'oauth-account-mismatch')
  assert.deepEqual(
    credentialStore.load(OAuthProviderEnum.GoogleDrive),
    existingCredential
  )
})

test('a cancelled attempt cannot clobber an immediate replacement connection', async () => {
  const listeners: Array<{
    listener: OAuthLoopbackListener
    resolve: (value: { code: string }) => void
    reject: (error: Error) => void
  }> = []
  const authorizationUrls: string[] = []
  const configuration = configurations.get(OAuthProviderEnum.GoogleDrive)!
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => {
      let resolveResult: (value: { code: string }) => void = () => undefined
      let rejectResult: (error: Error) => void = () => undefined
      const result = new Promise<{ code: string }>((resolve, reject) => {
        resolveResult = resolve
        rejectResult = reject
      })
      const listener = {
        cancel: () => rejectResult(new Error('oauth-cancelled')),
        redirectUri: `http://127.0.0.1:32123/oauth/callback/google-drive`,
        result,
      }

      listeners.push({
        listener,
        reject: rejectResult,
        resolve: resolveResult,
      })

      return listener
    },
    credentialStore: new MemoryCredentialStore(),
    fetchImplementation: async (url) => {
      if (url.toString() === configuration.jwksEndpoint) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
        })
      }

      const nonce = new URL(authorizationUrls.at(-1)!).searchParams.get(
        'nonce'
      )!

      return new Response(
        JSON.stringify({
          access_token: 'replacement-access-token',
          expires_in: 3600,
          id_token: createIdToken(configuration, nonce),
          refresh_token: 'replacement-refresh-token',
          token_type: 'Bearer',
        }),
        { status: 200 }
      )
    },
    now: () => now,
    openExternal: async (url) => {
      authorizationUrls.push(url)
    },
  })

  const firstConnect = service.connect({
    provider: OAuthProviderEnum.GoogleDrive,
  })
  await new Promise((resolve) => setImmediate(resolve))
  service.cancel()
  const secondConnect = service.connect({
    provider: OAuthProviderEnum.GoogleDrive,
  })
  await new Promise((resolve) => setImmediate(resolve))
  listeners[1].resolve({ code: 'replacement-code' })

  await firstConnect
  const state = await secondConnect

  assert.equal(state.status, 'connected')
  assert.equal(state.account?.accountId, 'account-1')
})

test('disconnect during connect leaves no stale connection state', async () => {
  let rejectResult: (error: Error) => void = () => undefined
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => ({
      cancel: () => rejectResult(new Error('oauth-cancelled')),
      redirectUri: 'http://127.0.0.1:32123/oauth/callback/google-drive',
      result: new Promise((_, reject) => {
        rejectResult = reject
      }),
    }),
    credentialStore: new MemoryCredentialStore(),
    now: () => now,
    openExternal: async () => undefined,
  })

  const connect = service.connect({ provider: OAuthProviderEnum.GoogleDrive })
  await new Promise((resolve) => setImmediate(resolve))
  const disconnected = await service.disconnect(OAuthProviderEnum.GoogleDrive)
  await connect

  assert.equal(disconnected.status, 'disconnected')
  assert.equal(service.getState().status, 'disconnected')
})

test('a new connection cannot start while disconnect revocation is pending', async () => {
  const credentialStore = new MemoryCredentialStore()
  credentialStore.save(OAuthProviderEnum.GoogleDrive, {
    account: {
      accountId: 'account-1',
      displayName: null,
      provider: OAuthProviderEnum.GoogleDrive,
      tenantId: null,
    },
    refreshToken: 'old-refresh-token',
  })
  let listenerCreations = 0
  let resolveRevocation: (response: Response) => void = () => undefined
  const revocation = new Promise<Response>((resolve) => {
    resolveRevocation = resolve
  })
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => {
      listenerCreations += 1
      throw new Error('connection-must-wait-for-disconnect')
    },
    credentialStore,
    fetchImplementation: async () => revocation,
    now: () => now,
    openExternal: async () => undefined,
  })

  const disconnect = service.disconnect(OAuthProviderEnum.GoogleDrive)
  await new Promise((resolve) => setImmediate(resolve))
  const connectDuringDisconnect = await service.connect({
    provider: OAuthProviderEnum.GoogleDrive,
  })

  assert.equal(connectDuringDisconnect.status, 'disconnected')
  assert.equal(listenerCreations, 0)

  resolveRevocation(new Response(null, { status: 200 }))
  await disconnect

  assert.equal(credentialStore.load(OAuthProviderEnum.GoogleDrive), null)
})
test('an in-flight refresh cannot restore credentials after disconnect', async () => {
  const credentialStore = new MemoryCredentialStore()
  credentialStore.save(OAuthProviderEnum.GoogleDrive, {
    account: {
      accountId: 'account-1',
      displayName: null,
      provider: OAuthProviderEnum.GoogleDrive,
      tenantId: null,
    },
    refreshToken: 'old-refresh-token',
  })
  let resolveRefresh: (response: Response) => void = () => undefined
  const refreshResponse = new Promise<Response>((resolve) => {
    resolveRefresh = resolve
  })
  const configuration = configurations.get(OAuthProviderEnum.GoogleDrive)!
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => {
      throw new Error('should-not-start-listener')
    },
    credentialStore,
    fetchImplementation: async (url) => {
      if (url.toString() === configuration.tokenEndpoint) {
        return refreshResponse
      }

      return new Response(null, { status: 200 })
    },
    now: () => now,
    openExternal: async () => undefined,
  })

  const accessCredential = service.getAccessCredential(
    OAuthProviderEnum.GoogleDrive
  )
  await new Promise((resolve) => setImmediate(resolve))
  await service.disconnect(OAuthProviderEnum.GoogleDrive)
  resolveRefresh(
    new Response(
      JSON.stringify({
        access_token: 'late-access-token',
        expires_in: 3600,
        refresh_token: 'late-rotated-refresh-token',
        token_type: 'Bearer',
      }),
      { status: 200 }
    )
  )

  await assert.rejects(accessCredential, /oauth-reconnect-required/)
  assert.equal(credentialStore.load(OAuthProviderEnum.GoogleDrive), null)
  assert.equal(service.getState().status, 'disconnected')
})

test('broker access is rejected while disconnect revocation is pending', async () => {
  const credentialStore = new MemoryCredentialStore()
  credentialStore.save(OAuthProviderEnum.GoogleDrive, {
    account: {
      accountId: 'account-1',
      displayName: null,
      provider: OAuthProviderEnum.GoogleDrive,
      tenantId: null,
    },
    refreshToken: 'old-refresh-token',
  })
  let resolveRevocation: (response: Response) => void = () => undefined
  const revocation = new Promise<Response>((resolve) => {
    resolveRevocation = resolve
  })
  let tokenRequests = 0
  const configuration = configurations.get(OAuthProviderEnum.GoogleDrive)!
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => {
      throw new Error('should-not-start-listener')
    },
    credentialStore,
    fetchImplementation: async (url) => {
      if (url.toString() === configuration.tokenEndpoint) {
        tokenRequests += 1

        return new Response(
          JSON.stringify({
            access_token: 'cached-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
          { status: 200 }
        )
      }

      return revocation
    },
    now: () => now,
    openExternal: async () => undefined,
  })

  await service.getAccessCredential(OAuthProviderEnum.GoogleDrive)
  const disconnect = service.disconnect(OAuthProviderEnum.GoogleDrive)
  await new Promise((resolve) => setImmediate(resolve))

  await assert.rejects(
    service.getAccessCredential(OAuthProviderEnum.GoogleDrive),
    /oauth-reconnect-required/
  )
  assert.equal(tokenRequests, 1)

  resolveRevocation(new Response(null, { status: 200 }))
  await disconnect

  assert.equal(credentialStore.load(OAuthProviderEnum.GoogleDrive), null)
  assert.equal(service.getState().status, 'disconnected')
})
test('disconnect attempts supported revocation and always removes local credentials', async () => {
  const credentialStore = new MemoryCredentialStore()
  credentialStore.save(OAuthProviderEnum.GoogleDrive, {
    account: {
      accountId: 'account-1',
      displayName: null,
      provider: OAuthProviderEnum.GoogleDrive,
      tenantId: null,
    },
    refreshToken: 'refresh-token-to-revoke',
  })
  let revocationBody = ''
  const service = new OAuthService({
    configurations,
    createLoopbackListener: async () => {
      throw new Error('should-not-start-listener')
    },
    credentialStore,
    fetchImplementation: async (_url, init) => {
      revocationBody = init?.body?.toString() ?? ''

      return new Response(null, { status: 503 })
    },
    now: () => now,
    openExternal: async () => undefined,
  })

  const state = await service.disconnect(OAuthProviderEnum.GoogleDrive)

  assert.equal(state.status, 'disconnected')
  assert.match(revocationBody, /token=refresh-token-to-revoke/)
  assert.equal(credentialStore.load(OAuthProviderEnum.GoogleDrive), null)
})
