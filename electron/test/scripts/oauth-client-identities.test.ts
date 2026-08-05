import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createPackagedOAuthVerificationEnvironment } from '../../scripts/create-packaged-oauth-verification-environment.util.mjs'
import { embedOAuthClientIdentities } from '../../scripts/embed-oauth-client-identities.util.mjs'
import { verifyOAuthClientIdentities } from '../../scripts/verify-oauth-client-identities.util.mjs'
import { withOAuthClientIdentityFile } from './utils/with-oauth-client-identity-file.util'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const validEnvironment = {
  NOTESTACK_GOOGLE_OAUTH_CLIENT_ID:
    '123456789-note-stack.apps.googleusercontent.com',
  NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID: '12345678-1234-1234-1234-123456789abc',
}
test('embeds and verifies both OAuth client identities', () => {
  withOAuthClientIdentityFile((identitiesPath) => {
    embedOAuthClientIdentities(identitiesPath, validEnvironment)
    verifyOAuthClientIdentities(identitiesPath, validEnvironment)

    const source = readFileSync(identitiesPath, 'utf8')

    assert.doesNotMatch(source, /__NOTESTACK_.*_OAUTH_CLIENT_ID__/)
    assert.match(source, /123456789-note-stack\.apps\.googleusercontent\.com/)
    assert.match(source, /12345678-1234-1234-1234-123456789abc/)
  })
})

test('restores placeholders when a later build omits OAuth identities', () => {
  withOAuthClientIdentityFile((identitiesPath) => {
    embedOAuthClientIdentities(identitiesPath, validEnvironment)
    verifyOAuthClientIdentities(identitiesPath, validEnvironment)

    embedOAuthClientIdentities(identitiesPath, {})

    assert.throws(
      () => verifyOAuthClientIdentities(identitiesPath, validEnvironment),
      /NOTESTACK_GOOGLE_OAUTH_CLIENT_ID is missing from the build/
    )
  })
})
test('reports each missing OAuth identity without exposing configured values', () => {
  for (const missingName of Object.keys(validEnvironment)) {
    withOAuthClientIdentityFile((identitiesPath) => {
      const environment = { ...validEnvironment }

      delete environment[missingName as keyof typeof environment]
      embedOAuthClientIdentities(identitiesPath, environment)

      assert.throws(
        () => verifyOAuthClientIdentities(identitiesPath, environment),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.match(error.message, new RegExp(missingName))

          for (const value of Object.values(validEnvironment)) {
            assert.doesNotMatch(error.message, new RegExp(value))
          }

          return true
        }
      )
    })
  }
})

test('rejects blank and invalid OAuth identities', () => {
  withOAuthClientIdentityFile((identitiesPath) => {
    embedOAuthClientIdentities(identitiesPath, {
      ...validEnvironment,
      NOTESTACK_GOOGLE_OAUTH_CLIENT_ID: '   ',
    })

    assert.throws(
      () =>
        verifyOAuthClientIdentities(identitiesPath, {
          ...validEnvironment,
          NOTESTACK_GOOGLE_OAUTH_CLIENT_ID: '   ',
        }),
      /NOTESTACK_GOOGLE_OAUTH_CLIENT_ID is missing/
    )
  })

  withOAuthClientIdentityFile((identitiesPath) => {
    assert.throws(
      () =>
        embedOAuthClientIdentities(identitiesPath, {
          ...validEnvironment,
          NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID: 'not-a-client-id',
        }),
      /NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID is not a valid OAuth client ID/
    )
  })
})

test('rejects an embedded OAuth identity that differs from the build environment', () => {
  withOAuthClientIdentityFile((identitiesPath) => {
    embedOAuthClientIdentities(identitiesPath, validEnvironment)

    assert.throws(
      () =>
        verifyOAuthClientIdentities(identitiesPath, {
          ...validEnvironment,
          NOTESTACK_GOOGLE_OAUTH_CLIENT_ID:
            '987654321-other.apps.googleusercontent.com',
        }),
      /NOTESTACK_GOOGLE_OAUTH_CLIENT_ID does not match the embedded build/
    )
  })
})
test('removes build-time OAuth identities from packaged verification', () => {
  const environment = createPackagedOAuthVerificationEnvironment({
    ...validEnvironment,
    notestack_google_oauth_client_id: 'lowercase-duplicate',
    PATH: 'verification-path',
  })

  assert.deepEqual(environment, { PATH: 'verification-path' })
})

test('release workflow and Electron commands enforce OAuth configuration', () => {
  const workflow = readFileSync(
    path.resolve(dirname, '../../../.github/workflows/release-electron.yml'),
    'utf8'
  )
  const packageJson = JSON.parse(
    readFileSync(path.resolve(dirname, '../../package.json'), 'utf8')
  ) as { scripts: Record<string, string> }

  assert.match(
    workflow,
    /NOTESTACK_GOOGLE_OAUTH_CLIENT_ID: \$\{\{ vars\.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID \}\}/
  )
  assert.match(
    workflow,
    /NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID: \$\{\{ vars\.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID \}\}/
  )
  assert.match(workflow, /Validate OAuth client identities/)

  for (const scriptName of [
    'dev',
    'package',
    'package:dir',
    'package:release',
  ]) {
    assert.match(
      packageJson.scripts[scriptName],
      /npm run verify:oauth-registration/
    )
  }

  assert.doesNotMatch(
    packageJson.scripts['package:prepackaged'],
    /verify:oauth-registration/
  )
})
