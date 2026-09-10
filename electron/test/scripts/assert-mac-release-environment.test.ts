import assert from 'node:assert/strict'
import test from 'node:test'
import { assertMacReleaseEnvironment } from '../../scripts/assert-mac-release-environment.util.mjs'

const completeEnvironment = {
  APPLE_API_ISSUER: 'issuer-secret',
  APPLE_API_KEY: '/private/AuthKey.p8',
  APPLE_API_KEY_ID: 'key-id-secret',
  CSC_KEY_PASSWORD: 'certificate-password-secret',
  CSC_LINK: '/private/certificate.p12',
}

test('accepts complete macOS release configuration', () => {
  assert.doesNotThrow(() => assertMacReleaseEnvironment(completeEnvironment))
})

test('reports missing variable names without leaking secret values', () => {
  const environment = {
    ...completeEnvironment,
    APPLE_API_KEY_ID: '',
    CSC_LINK: '',
  }

  assert.throws(
    () => assertMacReleaseEnvironment(environment),
    (error: Error) => {
      assert.match(error.message, /APPLE_API_KEY_ID/)
      assert.match(error.message, /CSC_LINK/)
      assert.doesNotMatch(error.message, /secret/)

      return true
    }
  )
})
