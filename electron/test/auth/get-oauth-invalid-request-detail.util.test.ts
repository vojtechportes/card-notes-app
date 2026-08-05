import assert from 'node:assert/strict'
import test from 'node:test'
import type { OAuthTokenOperation } from '../../src/auth/types/oauth-token-operation'
import { getOAuthInvalidRequestDetail } from '../../src/auth/utils/get-oauth-invalid-request-detail.util'

const operationFields: Record<OAuthTokenOperation, string[]> = {
  'authorization-code': [
    'client_id',
    'client_secret',
    'code',
    'code_verifier',
    'grant_type',
    'redirect_uri',
  ],
  'refresh-token': [
    'client_id',
    'client_secret',
    'grant_type',
    'refresh_token',
    'scope',
  ],
}

test('classifies exact missing and malformed request parameters', () => {
  for (const [operation, fields] of Object.entries(operationFields) as [
    OAuthTokenOperation,
    string[],
  ][]) {
    for (const field of fields) {
      const normalizedField = field.replaceAll('_', '-')

      assert.equal(
        getOAuthInvalidRequestDetail(
          operation,
          `Missing required parameter: ${field}`
        ),
        `missing-${normalizedField}`
      )
      assert.equal(
        getOAuthInvalidRequestDetail(
          operation,
          `Invalid parameter value for: ${field}`
        ),
        `malformed-${normalizedField}`
      )
    }
  }
})

test('accepts only deliberate anchored template variants', () => {
  assert.equal(
    getOAuthInvalidRequestDetail(
      'authorization-code',
      '  Missing parameter: "code".  '
    ),
    'missing-code'
  )
  assert.equal(
    getOAuthInvalidRequestDetail(
      'refresh-token',
      "'refresh_token' is missing."
    ),
    'missing-refresh-token'
  )
  assert.equal(
    getOAuthInvalidRequestDetail(
      'authorization-code',
      "Malformed parameter: 'redirect_uri'."
    ),
    'malformed-redirect-uri'
  )
})

test('rejects unknown, incompatible, and adversarial descriptions', () => {
  const sensitiveSecret = 'secret-value-must-not-leak'

  assert.equal(
    getOAuthInvalidRequestDetail(
      'authorization-code',
      'Missing required parameter: refresh_token'
    ),
    null
  )
  assert.equal(
    getOAuthInvalidRequestDetail(
      'refresh-token',
      'Missing required parameter: code_verifier'
    ),
    null
  )
  assert.equal(
    getOAuthInvalidRequestDetail(
      'authorization-code',
      'Missing required parameter: unknown_field'
    ),
    null
  )
  assert.equal(
    getOAuthInvalidRequestDetail(
      'authorization-code',
      `Missing required parameter: client_secret ${sensitiveSecret}`
    ),
    null
  )
  assert.equal(getOAuthInvalidRequestDetail('authorization-code', null), null)
  assert.equal(getOAuthInvalidRequestDetail('authorization-code', []), null)
})
