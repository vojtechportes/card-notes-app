import assert from 'node:assert/strict'
import test from 'node:test'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'
import { getOAuthCallbackPath } from '../../src/auth/utils/get-oauth-callback-path.util'

test('returns provider-compatible OAuth callback paths', () => {
  assert.equal(getOAuthCallbackPath(OAuthProviderEnum.GoogleDrive), '/')
  assert.equal(
    getOAuthCallbackPath(OAuthProviderEnum.OneDrive),
    '/oauth/callback/one-drive'
  )
})
