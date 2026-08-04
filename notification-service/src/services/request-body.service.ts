import { MAX_REQUEST_BODY_BYTES } from '../constants/relay.constants'
import { RelayError } from './relay-error'

export class RequestBodyService {
  public async readJson<T>(request: Request): Promise<T> {
    const declaredLength = Number(request.headers.get('content-length') ?? '0')

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_REQUEST_BODY_BYTES
    ) {
      throw new RelayError(
        413,
        'request_too_large',
        'The request body is too large'
      )
    }

    const body = request.body

    if (body === null) {
      throw new RelayError(
        400,
        'invalid_json',
        'The request body must be valid JSON'
      )
    }

    const reader = body.getReader()
    const decoder = new TextDecoder()
    let bodyText = ''
    let receivedBytes = 0

    while (true) {
      const result = await reader.read()

      if (result.done) {
        bodyText += decoder.decode()
        break
      }

      receivedBytes += result.value.byteLength

      if (receivedBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel()
        throw new RelayError(
          413,
          'request_too_large',
          'The request body is too large'
        )
      }

      bodyText += decoder.decode(result.value, { stream: true })
    }

    try {
      const parsed = JSON.parse(bodyText) as unknown

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        throw new RelayError(
          400,
          'invalid_json_object',
          'The request body must be a JSON object'
        )
      }

      return parsed as T
    } catch (error) {
      if (error instanceof RelayError) {
        throw error
      }

      throw new RelayError(
        400,
        'invalid_json',
        'The request body must be valid JSON'
      )
    }
  }
}
