import {
  MAX_WEBSOCKET_MESSAGE_BYTES,
  RELAY_PROTOCOL_VERSION,
} from '../constants/relay.constants'
import type { WebSocketMessageResult } from '../types/websocket-message-result'
import { WebSocketProtocolError } from './websocket-protocol-error'

export class WebSocketProtocolService {
  public handleIncomingMessage(
    message: string | ArrayBuffer
  ): WebSocketMessageResult {
    const byteLength =
      typeof message === 'string'
        ? new TextEncoder().encode(message).byteLength
        : message.byteLength

    if (byteLength > MAX_WEBSOCKET_MESSAGE_BYTES) {
      throw new WebSocketProtocolError(1009, 'message-too-large')
    }

    let parsed: unknown

    try {
      const text =
        typeof message === 'string'
          ? message
          : new TextDecoder().decode(message)

      parsed = JSON.parse(text) as unknown
    } catch {
      throw new WebSocketProtocolError(1003, 'invalid-message')
    }

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new WebSocketProtocolError(1003, 'invalid-message')
    }

    const messageType = Reflect.get(parsed, 'type')

    if (messageType !== 'pong' && messageType !== 'ping') {
      throw new WebSocketProtocolError(1003, 'unsupported-message')
    }

    if (messageType === 'ping') {
      return {
        response: JSON.stringify({
          type: 'pong',
          protocolVersion: RELAY_PROTOCOL_VERSION,
        }),
      }
    }

    return { response: null }
  }
}
