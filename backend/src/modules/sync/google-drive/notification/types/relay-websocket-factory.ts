import type WebSocket from 'ws'

export type RelayWebSocketFactory = (
  url: string,
  protocols: string[]
) => WebSocket
