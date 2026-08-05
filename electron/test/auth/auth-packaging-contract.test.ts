import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'
import { createOAuthProviderConfigurations } from '../../src/auth/utils/create-oauth-provider-configurations.util'

const dirname = path.dirname(fileURLToPath(import.meta.url))

test('development and packaged runtimes share narrow provider configuration', () => {
  const previousGoogleClientId = process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID
  const previousGoogleClientSecret =
    process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET
  const previousMicrosoftClientId =
    process.env.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID

  process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID = 'google-client-id'
  process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET = '  google-client-secret  '
  process.env.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID =
    '11111111-1111-1111-1111-111111111111'

  try {
    const configurations = createOAuthProviderConfigurations()
    const google = configurations.get(OAuthProviderEnum.GoogleDrive)!
    const microsoft = configurations.get(OAuthProviderEnum.OneDrive)!

    assert.match(google.authorizationEndpoint, /^https:\/\//)
    assert.match(microsoft.authorizationEndpoint, /^https:\/\//)
    assert.equal(google.clientSecret, 'google-client-secret')
    assert.equal(microsoft.clientSecret, null)
    assert.equal(
      google.scopes.includes('https://www.googleapis.com/auth/drive.appdata'),
      true
    )
    assert.equal(microsoft.scopes.includes('Files.ReadWrite.AppFolder'), true)
    assert.equal(
      microsoft.scopes.some((scope) => scope.includes('Files.Read.All')),
      false
    )
    assert.equal(
      microsoft.scopes.some((scope) => scope === 'Files.Read'),
      false
    )
  } finally {
    if (previousGoogleClientId === undefined) {
      delete process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID
    } else {
      process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID = previousGoogleClientId
    }

    if (previousGoogleClientSecret === undefined) {
      delete process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET
    } else {
      process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET =
        previousGoogleClientSecret
    }

    if (previousMicrosoftClientId === undefined) {
      delete process.env.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID
    } else {
      process.env.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID =
        previousMicrosoftClientId
    }
  }

  const source = readFileSync(
    path.resolve(dirname, '../../src/main.ts'),
    'utf8'
  )

  assert.match(source, /NOTESTACK_CREDENTIAL_BROKER_BOOTSTRAP: 'stdin'/)
  assert.match(source, /childProcess\.stdin\?\.end/)
  assert.doesNotMatch(
    source,
    /authorization:\s*authRuntime\.bootstrap\.authorization/
  )
  assert.doesNotMatch(source, /client_secret/)
})
