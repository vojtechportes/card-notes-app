import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { embedOAuthClientSecret } from '../../scripts/embed-oauth-client-secret.util.mjs'
import { verifyOAuthClientSecret } from '../../scripts/verify-oauth-client-secret.util.mjs'
import { withOAuthClientSecretFile } from './utils/with-oauth-client-secret-file.util'

const environmentName = 'NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET'
const configuredSecret = 'GOCSPX-test-secret-value'
const validEnvironment = {
  [environmentName]: configuredSecret,
}

test('embeds and verifies the Google OAuth client credential', () => {
  withOAuthClientSecretFile((secretPath) => {
    embedOAuthClientSecret(secretPath, validEnvironment)
    verifyOAuthClientSecret(secretPath, validEnvironment)

    const source = readFileSync(secretPath, 'utf8')

    assert.doesNotMatch(source, /__NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET__/)
    assert.match(source, /GOCSPX-test-secret-value/)
  })
})

test('restores the placeholder when a later build omits the credential', () => {
  withOAuthClientSecretFile((secretPath) => {
    embedOAuthClientSecret(secretPath, validEnvironment)
    verifyOAuthClientSecret(secretPath, validEnvironment)

    embedOAuthClientSecret(secretPath, {})

    assert.throws(
      () => verifyOAuthClientSecret(secretPath, validEnvironment),
      /NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET is missing from the build/
    )
  })
})

test('rejects missing, invalid, oversized, and mismatched credentials without exposing values', () => {
  const invalidValues = [
    '__NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET__',
    'secret with spaces',
    'x'.repeat(257),
  ]

  for (const invalidValue of invalidValues) {
    withOAuthClientSecretFile((secretPath) => {
      assert.throws(
        () =>
          embedOAuthClientSecret(secretPath, {
            [environmentName]: invalidValue,
          }),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.match(error.message, new RegExp(environmentName))
          assert.doesNotMatch(error.message, new RegExp(invalidValue))

          return true
        }
      )
    })
  }

  withOAuthClientSecretFile((secretPath) => {
    embedOAuthClientSecret(secretPath, validEnvironment)

    assert.throws(
      () =>
        verifyOAuthClientSecret(secretPath, {
          [environmentName]: 'different-secret-value',
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, new RegExp(environmentName))
        assert.doesNotMatch(error.message, /test-secret|different-secret/)

        return true
      }
    )
  })
})

test('requires a nonblank credential without printing configured values', () => {
  for (const environment of [{}, { [environmentName]: '   ' }]) {
    withOAuthClientSecretFile((secretPath) => {
      embedOAuthClientSecret(secretPath, environment)

      assert.throws(
        () => verifyOAuthClientSecret(secretPath, environment),
        new RegExp(`${environmentName} is missing`)
      )
    })
  }
})
