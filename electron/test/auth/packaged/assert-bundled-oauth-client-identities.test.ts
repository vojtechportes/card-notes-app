import assert from 'node:assert/strict'
import test from 'node:test'
import { assertBundledOAuthClientIdentities } from '../../../src/auth/packaged/assert-bundled-oauth-client-identities.util'
import { OAuthProviderEnum } from '../../../src/auth/types/oauth-provider-enum'

const configuredIdentities = new Map([
  [OAuthProviderEnum.GoogleDrive, { clientId: 'configured-google-client' }],
  [OAuthProviderEnum.OneDrive, { clientId: 'configured-microsoft-client' }],
])

test('accepts packaged configuration with both bundled OAuth identities', () => {
  assert.doesNotThrow(() =>
    assertBundledOAuthClientIdentities(configuredIdentities)
  )
})

test('rejects each missing packaged OAuth identity', () => {
  for (const missingProvider of Object.values(OAuthProviderEnum)) {
    const configurations = new Map(configuredIdentities)

    configurations.set(missingProvider, { clientId: '' })

    assert.throws(
      () => assertBundledOAuthClientIdentities(configurations),
      new RegExp(
        `Packaged OAuth client identity is missing: ${missingProvider}`
      )
    )
  }
})
