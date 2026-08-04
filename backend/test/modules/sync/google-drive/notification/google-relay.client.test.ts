import { EventEmitter } from 'node:events'
import type WebSocket from 'ws'
import { describe, expect, it, vi } from 'vitest'
import { GoogleRelayClient } from '../../../../../src/modules/sync/google-drive/notification/google-relay.client'

class FakeWebSocket extends EventEmitter {
  readonly sent: string[] = []
  readonly closes: Array<{ code?: number; reason?: string }> = []

  send(value: string): void {
    this.sent.push(value)
  }

  close(code?: number, reason?: string): void {
    this.closes.push({ code, reason })
  }
}

const routing = {
  workspaceRouteId: 'AAAAAAAAAAAAAAAAAAAAAA',
  notificationAuthKey: Buffer.alloc(32, 1).toString('base64url'),
  secretVersion: 1,
}

const createRelayFetch = () => {
  const requests: Array<{ url: string; init: RequestInit }> = []
  const fetchImplementation = vi.fn(
    async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input)
      requests.push({ url, init })

      if (url.endsWith('/register')) {
        return new Response(JSON.stringify({ created: true }), { status: 201 })
      }
      if (url.endsWith('/challenges')) {
        return new Response(
          JSON.stringify({
            challengeId: 'challenge-id',
            challenge: 'challenge-value',
            expiresAt: 60_000,
          }),
          { status: 201 }
        )
      }
      if (url.endsWith('/tokens')) {
        return new Response(
          JSON.stringify({ token: 'connection-token', expiresAt: 300_000 }),
          { status: 201 }
        )
      }
      if (url.endsWith('/channels/prepare')) {
        return new Response(
          JSON.stringify({
            channelId: 'channel-id',
            verificationToken: 'channel-token',
            webhookUrl: 'https://relay.example/webhook',
            preparationExpiresAt: 600_000,
          }),
          { status: 201 }
        )
      }

      return new Response(null, { status: 204 })
    }
  )

  return { fetchImplementation, requests }
}

describe(GoogleRelayClient.name, () => {
  it('authenticates without sending workspace secrets in URLs or persistence', async () => {
    const socket = new FakeWebSocket()
    const protocols: string[][] = []
    const { fetchImplementation, requests } = createRelayFetch()
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        now: () => 1_000,
        webSocketFactory: (url, offeredProtocols) => {
          expect(url).toBe(
            'wss://relay.example/v1/workspaces/AAAAAAAAAAAAAAAAAAAAAA/connect'
          )
          protocols.push(offeredProtocols)
          queueMicrotask(() => socket.emit('open'))

          return socket as unknown as WebSocket
        },
      }
    )

    await client.connect(vi.fn(), vi.fn())
    await client.prepareChannel()

    expect(protocols).toEqual([
      ['notestack.relay.v1', 'notestack.token.connection-token'],
    ])
    expect(requests.every(({ url }) => !url.includes('connection-token'))).toBe(
      true
    )
    expect(
      requests.every(({ url }) => !url.includes(routing.notificationAuthKey))
    ).toBe(true)
    const tokenRequest = requests.find(({ url }) => url.endsWith('/tokens'))
    const tokenBody = JSON.parse(String(tokenRequest?.init.body))
    expect(tokenBody).toMatchObject({
      challengeId: 'challenge-id',
      deviceId: '11111111-1111-4111-8111-111111111111',
      secretVersion: 1,
    })
    expect(tokenBody.proof).toBe('v7sm5x2P8YX_TaJKaK4QYVEuHS_4NgrBUtHkEe8sUvo')
  })

  it('bounds a blackholed relay registration before WebSocket setup', async () => {
    const webSocketFactory = vi.fn()
    const fetchImplementation = vi.fn(
      async (_input: string | URL | Request, init: RequestInit = {}) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted'))
          )
        })
    )
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        requestTimeoutMs: 5,
        webSocketFactory,
      }
    )

    await expect(client.connect(vi.fn(), vi.fn())).rejects.toThrow(
      'request timed out'
    )
    expect(webSocketFactory).not.toHaveBeenCalled()
  })

  it('bounds a relay response body that never completes', async () => {
    const fetchImplementation = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/register')) {
        return new Response(JSON.stringify({ created: true }), { status: 201 })
      }

      return new Response(new ReadableStream({ start: () => undefined }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    })
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      { fetchImplementation, requestTimeoutMs: 5 }
    )

    await expect(client.connect(vi.fn(), vi.fn())).rejects.toThrow(
      'request timed out'
    )
  })
  it('cancels a blackholed relay request during shutdown', async () => {
    let client: GoogleRelayClient
    const fetchImplementation = vi.fn(
      async (_input: string | URL | Request, init: RequestInit = {}) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted'))
          )
          queueMicrotask(() => client.close())
        })
    )
    client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      { fetchImplementation }
    )

    await expect(client.connect(vi.fn(), vi.fn())).rejects.toThrow(
      'request was cancelled'
    )
  })
  it('bounds and disposes a WebSocket handshake that never opens', async () => {
    const socket = new FakeWebSocket()
    const { fetchImplementation } = createRelayFetch()
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        handshakeTimeoutMs: 5,
        webSocketFactory: () => socket as unknown as WebSocket,
      }
    )

    await expect(client.connect(vi.fn(), vi.fn())).rejects.toThrow(
      'connection timed out'
    )
    expect(socket.closes).toEqual([{ code: 1000, reason: 'handshake-failed' }])
  })

  it('cancels and disposes an in-flight handshake during shutdown', async () => {
    const socket = new FakeWebSocket()
    const { fetchImplementation } = createRelayFetch()
    let client: GoogleRelayClient
    client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        webSocketFactory: () => {
          queueMicrotask(() => client.close())

          return socket as unknown as WebSocket
        },
      }
    )

    await expect(client.connect(vi.fn(), vi.fn())).rejects.toThrow(
      'connection was cancelled'
    )
    expect(socket.closes).toEqual([{ code: 1000, reason: 'handshake-failed' }])
  })
  it('rejects and disposes a WebSocket closed before opening', async () => {
    const socket = new FakeWebSocket()
    const { fetchImplementation } = createRelayFetch()
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        webSocketFactory: () => {
          queueMicrotask(() => socket.emit('close'))

          return socket as unknown as WebSocket
        },
      }
    )

    await expect(client.connect(vi.fn(), vi.fn())).rejects.toThrow(
      'closed during setup'
    )
    expect(socket.closes).toEqual([{ code: 1000, reason: 'handshake-failed' }])
  })

  it('rotates the relay verifier using the authenticated current version', async () => {
    const socket = new FakeWebSocket()
    const { fetchImplementation, requests } = createRelayFetch()
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        webSocketFactory: () => {
          queueMicrotask(() => socket.emit('open'))

          return socket as unknown as WebSocket
        },
      }
    )
    const nextRouting = {
      ...routing,
      notificationAuthKey: Buffer.alloc(32, 2).toString('base64url'),
      secretVersion: 2,
    }

    await client.connect(vi.fn(), vi.fn())
    await client.rotateVerifier(nextRouting, 123_000)

    const rotationRequest = requests.find(({ url }) =>
      url.endsWith('/verifier')
    )
    expect(rotationRequest?.init.method).toBe('PUT')
    expect(JSON.parse(String(rotationRequest?.init.body))).toEqual({
      verifier: 'SfSZ5RjeNdJBqaWkO3JZy0QXUZpLGVU_ITY-AcpmWDU',
      secretVersion: 2,
      rolloverUntil: 123_000,
    })
    expect(
      new Headers(rotationRequest?.init.headers).get('authorization')
    ).toBe('Bearer connection-token')
  })
  it('accepts a relay response proving another device already rotated', async () => {
    const socket = new FakeWebSocket()
    const relay = createRelayFetch()
    relay.fetchImplementation.mockImplementation(
      async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = String(input)

        if (url.endsWith('/verifier')) {
          return new Response(
            JSON.stringify({
              error: {
                code: 'invalid_secret_version',
                message: 'already rotated',
              },
            }),
            { status: 409 }
          )
        }

        if (url.endsWith('/register')) {
          return new Response(JSON.stringify({ created: true }), {
            status: 201,
          })
        }
        if (url.endsWith('/challenges')) {
          return new Response(
            JSON.stringify({
              challengeId: 'challenge-id',
              challenge: 'challenge-value',
              expiresAt: 60_000,
            }),
            { status: 201 }
          )
        }
        if (url.endsWith('/tokens')) {
          return new Response(
            JSON.stringify({ token: 'connection-token', expiresAt: 300_000 }),
            { status: 201 }
          )
        }

        return new Response(null, { status: 204 })
      }
    )
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation: relay.fetchImplementation,
        webSocketFactory: () => {
          queueMicrotask(() => socket.emit('open'))

          return socket as unknown as WebSocket
        },
      }
    )

    await client.connect(vi.fn(), vi.fn())

    await expect(
      client.rotateVerifier(
        {
          ...routing,
          notificationAuthKey: Buffer.alloc(32, 2).toString('base64url'),
          secretVersion: 2,
        },
        123_000
      )
    ).resolves.toBeUndefined()
  })
  it('accepts only exact versioned signals and answers relay heartbeats', async () => {
    const socket = new FakeWebSocket()
    const onWorkspaceChanged = vi.fn()
    const { fetchImplementation } = createRelayFetch()
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        webSocketFactory: () => {
          queueMicrotask(() => socket.emit('open'))

          return socket as unknown as WebSocket
        },
      }
    )

    await client.connect(onWorkspaceChanged, vi.fn())
    socket.emit(
      'message',
      Buffer.from(
        JSON.stringify({ type: 'workspace-changed', protocolVersion: 2 })
      )
    )
    socket.emit(
      'message',
      Buffer.from(JSON.stringify({ type: 'provider-data', protocolVersion: 1 }))
    )
    socket.emit(
      'message',
      Buffer.from(
        JSON.stringify({ type: 'workspace-changed', protocolVersion: 1 })
      )
    )
    socket.emit(
      'message',
      Buffer.from(JSON.stringify({ type: 'ping', protocolVersion: 1 }))
    )

    expect(onWorkspaceChanged).toHaveBeenCalledTimes(1)
    expect(socket.sent).toEqual([
      JSON.stringify({ type: 'pong', protocolVersion: 1 }),
    ])
  })

  it('closes oversized relay frames without triggering synchronization', async () => {
    const socket = new FakeWebSocket()
    const onWorkspaceChanged = vi.fn()
    const { fetchImplementation } = createRelayFetch()
    const client = new GoogleRelayClient(
      'https://relay.example',
      routing,
      '11111111-1111-4111-8111-111111111111',
      {
        fetchImplementation,
        webSocketFactory: () => {
          queueMicrotask(() => socket.emit('open'))

          return socket as unknown as WebSocket
        },
      }
    )

    await client.connect(onWorkspaceChanged, vi.fn())
    socket.emit('message', Buffer.alloc(4 * 1024 + 1))

    expect(onWorkspaceChanged).not.toHaveBeenCalled()
    expect(socket.closes).toEqual([{ code: 1009, reason: 'message-too-large' }])
  })
})
