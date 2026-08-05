import type { OAuthInvalidRequestDetail } from '../types/oauth-invalid-request-detail.js'
import type { OAuthTokenOperation } from '../types/oauth-token-operation.js'

const authorizationCodeFields = new Set([
  'client_id',
  'client_secret',
  'code',
  'code_verifier',
  'grant_type',
  'redirect_uri',
])
const refreshTokenFields = new Set([
  'client_id',
  'client_secret',
  'grant_type',
  'refresh_token',
  'scope',
])
const missingParameterPattern =
  /^\s*missing (?:required )?parameter:\s*['"]?([a-z_]+)['"]?\.?\s*$/i
const missingFieldPattern = /^\s*['"]?([a-z_]+)['"]? is missing\.?\s*$/i
const malformedParameterPattern =
  /^\s*(?:invalid parameter(?: value)?(?: for)?|malformed parameter):\s*['"]?([a-z_]+)['"]?\.?\s*$/i

export const getOAuthInvalidRequestDetail = (
  operation: OAuthTokenOperation,
  description: unknown
): OAuthInvalidRequestDetail | null => {
  if (typeof description !== 'string') {
    return null
  }

  const missingMatch =
    missingParameterPattern.exec(description) ??
    missingFieldPattern.exec(description)
  const malformedMatch = malformedParameterPattern.exec(description)
  const match = missingMatch ?? malformedMatch

  if (!match) {
    return null
  }

  const field = match[1].toLowerCase()
  const allowedFields =
    operation === 'authorization-code'
      ? authorizationCodeFields
      : refreshTokenFields

  if (!allowedFields.has(field)) {
    return null
  }

  const reason = missingMatch ? 'missing' : 'malformed'
  const normalizedField = field.replaceAll('_', '-')

  return `${reason}-${normalizedField}` as OAuthInvalidRequestDetail
}
