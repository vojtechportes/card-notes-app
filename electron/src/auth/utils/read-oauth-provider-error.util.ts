import type { OAuthProviderTokenError } from '../types/oauth-provider-token-error.js'
import type { OAuthTokenOperation } from '../types/oauth-token-operation.js'
import { getOAuthInvalidRequestDetail } from './get-oauth-invalid-request-detail.util.js'

const MAX_OAUTH_ERROR_RESPONSE_BYTES = 8_192
const emptyProviderError: OAuthProviderTokenError = {
  code: null,
  invalidRequestDetail: null,
}

export const readOAuthProviderError = async (
  response: Response,
  operation: OAuthTokenOperation
): Promise<OAuthProviderTokenError> => {
  const reader = response.body?.getReader()

  if (!reader) {
    return emptyProviderError
  }

  const decoder = new TextDecoder()
  let body = ''
  let receivedBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      receivedBytes += value.byteLength

      if (receivedBytes > MAX_OAUTH_ERROR_RESPONSE_BYTES) {
        await reader.cancel()
        return emptyProviderError
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    const parsedBody = JSON.parse(body) as unknown

    if (
      typeof parsedBody !== 'object' ||
      parsedBody === null ||
      !('error' in parsedBody) ||
      typeof parsedBody.error !== 'string'
    ) {
      return emptyProviderError
    }

    let invalidRequestDetail: OAuthProviderTokenError['invalidRequestDetail'] =
      null

    if (parsedBody.error === 'invalid_request') {
      const description =
        'error_description' in parsedBody ? parsedBody.error_description : null

      invalidRequestDetail = getOAuthInvalidRequestDetail(
        operation,
        description
      )
    }

    return {
      code: parsedBody.error,
      invalidRequestDetail,
    }
  } catch {
    return emptyProviderError
  }
}
