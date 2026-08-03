import assert from 'node:assert/strict'
import test from 'node:test'
import { startCredentialBrokerServer } from '../../src/auth/broker/start-credential-broker-server'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'
import type { OAuthServiceContract } from '../../src/auth/types/oauth-service-contract'

const oauthService: OAuthServiceContract = {
  cancel: () => ({
    account: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  }),
  connect: async () => ({
    account: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  }),
  disconnect: async () => ({
    account: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  }),
  dispose: () => undefined,
  getAccessCredential: async (provider) => ({
    accessToken: 'short-lived-access-token',
    expiresAt: '2026-08-03T11:00:00.000Z',
    provider,
  }),
  getState: () => ({
    account: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  }),
  reconnect: async () => ({
    account: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  }),
}

test('broker is loopback-only, authenticated, provider-scoped, and rejects replay', async () => {
  const broker = await startCredentialBrokerServer({ oauthService })

  try {
    const baseRequest = {
      body: JSON.stringify({
        provider: OAuthProviderEnum.GoogleDrive,
        requestId: 'unique-request-id-1234',
      }),
      headers: {
        Authorization: `Bearer ${broker.bootstrap.authorization}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
    const response = await fetch(
      `${broker.bootstrap.baseUrl}/v1/access-token`,
      baseRequest
    )

    assert.equal(new URL(broker.bootstrap.baseUrl).hostname, '127.0.0.1')
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      accessToken: 'short-lived-access-token',
      expiresAt: '2026-08-03T11:00:00.000Z',
      provider: OAuthProviderEnum.GoogleDrive,
    })

    const replayResponse = await fetch(
      `${broker.bootstrap.baseUrl}/v1/access-token`,
      baseRequest
    )
    assert.equal(replayResponse.status, 401)

    const unauthorizedResponse = await fetch(
      `${broker.bootstrap.baseUrl}/v1/access-token`,
      {
        ...baseRequest,
        headers: { Authorization: 'Bearer wrong' },
      }
    )
    assert.equal(unauthorizedResponse.status, 404)
    assert.doesNotMatch(await unauthorizedResponse.text(), /access-token/)
  } finally {
    await broker.dispose()
  }
})
