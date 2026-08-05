const MAX_OAUTH_ERROR_RESPONSE_BYTES = 8_192

export const readOAuthProviderErrorCode = async (
  response: Response
): Promise<string | null> => {
  const reader = response.body?.getReader()

  if (!reader) {
    return null
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
        return null
      }

      body += decoder.decode(value, { stream: true })
    }
    body += decoder.decode()
    const parsedBody = JSON.parse(body) as unknown

    if (
      typeof parsedBody === 'object' &&
      parsedBody !== null &&
      'error' in parsedBody &&
      typeof parsedBody.error === 'string'
    ) {
      return parsedBody.error
    }
  } catch {
    return null
  }

  return null
}
