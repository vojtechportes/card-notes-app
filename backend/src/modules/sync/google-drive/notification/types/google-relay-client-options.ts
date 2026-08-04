import type { RelayWebSocketFactory } from './relay-websocket-factory'

export interface GoogleRelayClientOptions {
  handshakeTimeoutMs?: number
  fetchImplementation?: typeof fetch
  now?: () => number
  requestTimeoutMs?: number
  webSocketFactory?: RelayWebSocketFactory
}
