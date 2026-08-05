import assert from 'node:assert/strict'
import test from 'node:test'
import { assertBundledGoogleOAuthClientSecret } from '../../../src/auth/packaged/assert-bundled-google-oauth-client-secret.util'
import { OAuthProviderEnum } from '../../../src/auth/types/oauth-provider-enum'

const configuredSecrets = new Map([
  [OAuthProviderEnum.GoogleDrive, { clientSecret: 'google-client-secret' }],
  [OAuthProviderEnum.OneDrive, { clientSecret: null }],
])

test('accepts a bundled Google credential and a secretless Microsoft client', () => {
  assert.doesNotThrow(() =>
    assertBundledGoogleOAuthClientSecret(configuredSecrets)
  )
})

test('rejects a missing bundled Google OAuth client credential', () => {
  const configurations = new Map(configuredSecrets)

  configurations.set(OAuthProviderEnum.GoogleDrive, { clientSecret: '' })

  assert.throws(
    () => assertBundledGoogleOAuthClientSecret(configurations),
    /Packaged Google OAuth client credential is missing/
  )
})

test('rejects a Microsoft OAuth client secret', () => {
  const configurations = new Map(configuredSecrets)

  configurations.set(OAuthProviderEnum.OneDrive, {
    clientSecret: 'must-not-be-configured',
  })

  assert.throws(
    () => assertBundledGoogleOAuthClientSecret(configurations),
    /Packaged Microsoft OAuth client secret must be absent/
  )
})
