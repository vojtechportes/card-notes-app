import assert from 'node:assert/strict'
import test from 'node:test'
import { readOAuthProviderError } from '../../src/auth/utils/read-oauth-provider-error.util'

test('returns only sanitized invalid-request information', async () => {
  const providerError = await readOAuthProviderError(
    new Response(
      JSON.stringify({
        error: 'invalid_request',
        error_description: 'Missing required parameter: client_secret',
      })
    ),
    'authorization-code'
  )

  assert.deepEqual(providerError, {
    code: 'invalid_request',
    invalidRequestDetail: 'missing-client-secret',
  })
  assert.doesNotMatch(JSON.stringify(providerError), /required parameter/)
})

test('does not classify descriptions for other provider errors', async () => {
  const providerError = await readOAuthProviderError(
    new Response(
      JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Missing required parameter: code',
      })
    ),
    'authorization-code'
  )

  assert.deepEqual(providerError, {
    code: 'invalid_grant',
    invalidRequestDetail: null,
  })
})

test('discards adversarial, malformed, and oversized provider bodies', async () => {
  const sensitiveValue = 'sensitive-value-must-not-leak'
  const adversarial = await readOAuthProviderError(
    new Response(
      JSON.stringify({
        error: 'invalid_request',
        error_description: `Missing required parameter: code ${sensitiveValue}`,
      })
    ),
    'authorization-code'
  )
  const malformed = await readOAuthProviderError(
    new Response('not-json'),
    'authorization-code'
  )
  const oversized = await readOAuthProviderError(
    new Response(
      JSON.stringify({
        error: 'invalid_request',
        error_description: 'Missing required parameter: code',
        padding: 'x'.repeat(9_000),
      })
    ),
    'authorization-code'
  )

  assert.deepEqual(adversarial, {
    code: 'invalid_request',
    invalidRequestDetail: null,
  })
  assert.deepEqual(malformed, {
    code: null,
    invalidRequestDetail: null,
  })
  assert.deepEqual(oversized, {
    code: null,
    invalidRequestDetail: null,
  })
  assert.doesNotMatch(JSON.stringify(adversarial), new RegExp(sensitiveValue))
})
