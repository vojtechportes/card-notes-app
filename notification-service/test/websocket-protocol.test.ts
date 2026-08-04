import { describe, expect, it, vi } from 'vitest'
import { AuthorizationService } from '../src/services/authorization.service'
import { RelayError } from '../src/services/relay-error'
import { WebSocketProtocolError } from '../src/services/websocket-protocol-error'
import { WebSocketProtocolService } from '../src/services/websocket-protocol.service'

describe('authenticated WebSocket protocol', () => {
  it('requires the version and short-lived token subprotocols', () => {
    const authorizationService = new AuthorizationService()
    const request = new Request('https://relay.test/connect', {
      headers: {
        'sec-websocket-protocol': `notestack.relay.v1, notestack.token.${'a'.repeat(43)}`,
      },
    })

    expect(authorizationService.getWebSocketToken(request)).toBe('a'.repeat(43))
    expect(() =>
      authorizationService.getWebSocketToken(
        new Request('https://relay.test/connect')
      )
    ).toThrowError(
      expect.objectContaining<Partial<RelayError>>({
        code: 'missing_connection_token',
      })
    )
  })

  it('handles heartbeat messages and rejects unsupported or oversized input', () => {
    const protocolService = new WebSocketProtocolService()

    expect(protocolService.handleIncomingMessage('{"type":"pong"}')).toEqual({
      response: null,
    })
    expect(
      protocolService.handleIncomingMessage('{"type":"ping"}').response
    ).toContain('"pong"')
    expect(() =>
      protocolService.handleIncomingMessage('{"type":"content"}')
    ).toThrowError(
      expect.objectContaining<Partial<WebSocketProtocolError>>({
        closeCode: 1003,
        closeReason: 'unsupported-message',
      })
    )
    expect(() =>
      protocolService.handleIncomingMessage('x'.repeat(4097))
    ).toThrowError(
      expect.objectContaining<Partial<WebSocketProtocolError>>({
        closeCode: 1009,
      })
    )
  })
})
