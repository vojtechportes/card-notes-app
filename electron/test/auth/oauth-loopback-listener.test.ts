import assert from 'node:assert/strict'
import test from 'node:test'
import { createOAuthLoopbackListener } from '../../src/auth/oauth/create-oauth-loopback-listener'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'

test('Google uses a bare loopback redirect and accepts the root callback', async () => {
  const listener = await createOAuthLoopbackListener(
    OAuthProviderEnum.GoogleDrive,
    'expected-state',
    2_000
  )
  const callbackUrl = new URL(listener.redirectUri)

  assert.equal(listener.redirectUri, callbackUrl.origin)
  assert.equal(callbackUrl.pathname, '/')

  callbackUrl.searchParams.set('state', 'expected-state')
  callbackUrl.searchParams.set('code', 'authorization-code')

  const response = await fetch(callbackUrl)

  assert.equal(response.status, 200)
  assert.deepEqual(await listener.result, { code: 'authorization-code' })
})

test('Google rejects the legacy provider path without settling the listener', async () => {
  const listener = await createOAuthLoopbackListener(
    OAuthProviderEnum.GoogleDrive,
    'expected-state',
    2_000
  )
  const legacyCallbackUrl = new URL(
    '/oauth/callback/google-drive',
    listener.redirectUri
  )
  legacyCallbackUrl.searchParams.set('state', 'expected-state')
  legacyCallbackUrl.searchParams.set('code', 'authorization-code')

  const legacyResponse = await fetch(legacyCallbackUrl)

  assert.equal(legacyResponse.status, 404)

  const callbackUrl = new URL(listener.redirectUri)
  callbackUrl.searchParams.set('state', 'expected-state')
  callbackUrl.searchParams.set('code', 'authorization-code')

  const response = await fetch(callbackUrl)

  assert.equal(response.status, 200)
  assert.deepEqual(await listener.result, { code: 'authorization-code' })
})

test('OneDrive retains its provider callback path', async () => {
  const listener = await createOAuthLoopbackListener(
    OAuthProviderEnum.OneDrive,
    'expected-state',
    2_000
  )
  const callbackUrl = new URL(listener.redirectUri)

  assert.equal(callbackUrl.pathname, '/oauth/callback/one-drive')

  const rootUrl = new URL('/', listener.redirectUri)
  rootUrl.searchParams.set('state', 'expected-state')
  rootUrl.searchParams.set('code', 'authorization-code')

  const rootResponse = await fetch(rootUrl)

  assert.equal(rootResponse.status, 404)

  callbackUrl.searchParams.set('state', 'expected-state')
  callbackUrl.searchParams.set('code', 'authorization-code')

  const response = await fetch(callbackUrl)

  assert.equal(response.status, 200)
  assert.deepEqual(await listener.result, { code: 'authorization-code' })
})

test('loopback callback rejects mismatched state without exposing the code', async () => {
  const listener = await createOAuthLoopbackListener(
    OAuthProviderEnum.OneDrive,
    'expected-state',
    2_000
  )
  const callbackUrl = new URL(listener.redirectUri)
  callbackUrl.searchParams.set('state', 'wrong-state')
  callbackUrl.searchParams.set('code', 'authorization-code')

  const rejectedResult = assert.rejects(listener.result, /oauth-state-mismatch/)
  const response = await fetch(callbackUrl)

  assert.equal(response.status, 400)
  await rejectedResult
  assert.doesNotMatch(await response.text(), /authorization-code/)
})

test('loopback callback rejects unsupported methods without settling', async () => {
  const listener = await createOAuthLoopbackListener(
    OAuthProviderEnum.GoogleDrive,
    'expected-state',
    2_000
  )
  const callbackUrl = new URL(listener.redirectUri)
  callbackUrl.searchParams.set('state', 'expected-state')
  callbackUrl.searchParams.set('code', 'authorization-code')

  const unsupportedResponse = await fetch(callbackUrl, { method: 'POST' })

  assert.equal(unsupportedResponse.status, 404)

  const response = await fetch(callbackUrl)

  assert.equal(response.status, 200)
  assert.deepEqual(await listener.result, { code: 'authorization-code' })
})

test('loopback callback supports cancellation and timeout', async () => {
  const cancelled = await createOAuthLoopbackListener(
    OAuthProviderEnum.GoogleDrive,
    'state',
    2_000
  )
  cancelled.cancel()
  await assert.rejects(cancelled.result, /oauth-cancelled/)

  const timedOut = await createOAuthLoopbackListener(
    OAuthProviderEnum.GoogleDrive,
    'state',
    10
  )
  await assert.rejects(timedOut.result, /oauth-timeout/)
})
