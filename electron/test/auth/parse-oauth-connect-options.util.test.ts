import assert from 'node:assert/strict'
import test from 'node:test'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'
import { parseOAuthConnectOptions } from '../../src/auth/utils/parse-oauth-connect-options.util'

test('parses provider-only OAuth connection options', () => {
  assert.deepEqual(
    parseOAuthConnectOptions({ provider: OAuthProviderEnum.GoogleDrive }),
    { provider: OAuthProviderEnum.GoogleDrive }
  )
})

test('rejects renderer-controlled OAuth account expectations and unknown fields', () => {
  for (const value of [
    {
      expectedAccountId: 'renderer-controlled-account',
      provider: OAuthProviderEnum.GoogleDrive,
    },
    { provider: OAuthProviderEnum.OneDrive, unexpected: true },
    { provider: 'unsupported-provider' },
    {},
    null,
  ]) {
    assert.throws(
      () => parseOAuthConnectOptions(value),
      /oauth-invalid-request/
    )
  }
})
