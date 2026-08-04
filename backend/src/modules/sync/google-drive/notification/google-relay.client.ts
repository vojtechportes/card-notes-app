import WebSocket, { type RawData } from 'ws'
import type { NotificationRouting } from '../../types/notification-routing'
import type { GoogleRelayClientOptions } from './types/google-relay-client-options'
import { RelayRequestError } from './relay-request.error'
import type { PreparedRelayChannel } from './types/prepared-relay-channel'
import type { RelayChallenge } from './types/relay-challenge'
import type { RelayConnectionToken } from './types/relay-connection-token'
import type { RelayRenewalLease } from './types/relay-renewal-lease'
import { createRelayChallengeProof } from './utils/create-relay-challenge-proof.util'
import { deriveWorkspaceVerifier } from './utils/derive-workspace-verifier.util'

const RELAY_PROTOCOL_VERSION = 1
const MAX_RELAY_MESSAGE_BYTES = 4 * 1024
const TOKEN_REFRESH_WINDOW_MS = 30_000
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 10_000
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

export class GoogleRelayClient {
  private readonly fetchImplementation: typeof fetch
  private readonly handshakeTimeoutMs: number
  private readonly now: () => number
  private readonly requestTimeoutMs: number
  private readonly webSocketFactory: NonNullable<
    GoogleRelayClientOptions['webSocketFactory']
  >
  private connectionToken: RelayConnectionToken | null = null
  private readonly activeRequestControllers = new Set<AbortController>()
  private readonly responseRequests = new Map<
    Response,
    { controller: AbortController; timeout: ReturnType<typeof setTimeout> }
  >()
  private socket: WebSocket | null = null
  private pendingSocket: WebSocket | null = null
  private cancelPendingHandshake: (() => void) | null = null
  private onWorkspaceChanged: (() => void) | null = null
  private onDisconnected: (() => void) | null = null

  constructor(
    private readonly baseUrl: string,
    private readonly routing: NotificationRouting,
    private readonly deviceId: string,
    options: GoogleRelayClientOptions = {}
  ) {
    this.fetchImplementation = options.fetchImplementation ?? fetch
    this.handshakeTimeoutMs =
      options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS
    this.now = options.now ?? Date.now
    this.requestTimeoutMs =
      options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    this.webSocketFactory =
      options.webSocketFactory ??
      ((url, protocols) => new WebSocket(url, protocols))
  }

  async connect(
    onWorkspaceChanged: () => void,
    onDisconnected: () => void
  ): Promise<void> {
    this.onWorkspaceChanged = onWorkspaceChanged
    this.onDisconnected = onDisconnected

    await this.registerWorkspace()
    this.connectionToken = null
    const token = await this.getConnectionToken()
    const socket = this.webSocketFactory(this.getWebSocketUrl(), [
      'notestack.relay.v1',
      `notestack.token.${token}`,
    ])

    this.pendingSocket = socket

    try {
      await this.waitForOpen(socket)
    } finally {
      if (this.pendingSocket === socket) {
        this.pendingSocket = null
      }
    }

    if (this.socket && this.socket !== socket) {
      this.disposeSocket(this.socket, 1000, 'replaced')
    }

    this.socket = socket
    socket.on('message', (data) => this.handleMessage(data))
    socket.on('close', () => this.handleDisconnect(socket))
    socket.on('error', () => this.handleDisconnect(socket))
  }

  async rotateVerifier(
    nextRouting: NotificationRouting,
    rolloverUntil: number
  ): Promise<void> {
    if (
      nextRouting.workspaceRouteId !== this.routing.workspaceRouteId ||
      nextRouting.secretVersion !== this.routing.secretVersion + 1
    ) {
      throw new Error('The synchronization relay rotation is invalid.')
    }

    try {
      await this.authorizedRequest('/verifier', {
        body: JSON.stringify({
          verifier: deriveWorkspaceVerifier(
            nextRouting.notificationAuthKey,
            nextRouting.workspaceRouteId
          ),
          secretVersion: nextRouting.secretVersion,
          rolloverUntil,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      })
    } catch (error) {
      if (
        error instanceof RelayRequestError &&
        (error.code === 'invalid_secret_version' ||
          error.code === 'unknown_secret_version')
      ) {
        return
      }

      throw error
    }
  }
  async prepareChannel(): Promise<PreparedRelayChannel> {
    return this.authorizedJsonRequest<PreparedRelayChannel>(
      '/channels/prepare',
      { method: 'POST' }
    )
  }

  async finalizeChannel(
    channelId: string,
    resourceId: string,
    expiresAt: number
  ): Promise<void> {
    await this.authorizedRequest(`/channels/${channelId}/finalize`, {
      body: JSON.stringify({ resourceId, expiresAt }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async removeChannel(channelId: string): Promise<void> {
    await this.authorizedRequest(`/channels/${channelId}`, {
      method: 'DELETE',
    })
  }

  async acquireRenewalLease(): Promise<RelayRenewalLease> {
    return this.authorizedJsonRequest<RelayRenewalLease>('/renewal-lease', {
      method: 'POST',
    })
  }

  async releaseRenewalLease(leaseId: string): Promise<void> {
    await this.authorizedRequest(
      `/renewal-lease?leaseId=${encodeURIComponent(leaseId)}`,
      { method: 'DELETE' }
    )
  }

  close(): void {
    const pendingSocket = this.pendingSocket
    const cancelPendingHandshake = this.cancelPendingHandshake
    const socket = this.socket
    this.pendingSocket = null
    this.cancelPendingHandshake = null
    this.socket = null
    this.onDisconnected = null
    this.onWorkspaceChanged = null

    for (const controller of this.activeRequestControllers) {
      controller.abort(
        new Error('The synchronization relay request was cancelled.')
      )
    }
    this.activeRequestControllers.clear()

    for (const request of this.responseRequests.values()) {
      clearTimeout(request.timeout)
    }
    this.responseRequests.clear()

    if (cancelPendingHandshake) {
      cancelPendingHandshake()
    } else if (pendingSocket) {
      this.disposeSocket(pendingSocket, 1000, 'client-disposed')
    }

    if (socket) {
      this.disposeSocket(socket, 1000, 'client-disposed')
    }
  }

  private waitForOpen(socket: WebSocket): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: Error): void => {
        clearTimeout(timeout)

        if (this.cancelPendingHandshake === cancelHandshake) {
          this.cancelPendingHandshake = null
        }
        socket.off('open', handleOpen)
        socket.off('error', handleError)
        socket.off('close', handleClose)
        socket.off('unexpected-response', handleUnexpectedResponse)

        if (error) {
          this.disposeSocket(socket, 1000, 'handshake-failed')
          reject(error)
          return
        }

        resolve()
      }
      const cancelHandshake = (): void =>
        finish(new Error('The synchronization relay connection was cancelled.'))
      const handleOpen = (): void => finish()
      const handleError = (): void =>
        finish(new Error('The synchronization relay connection failed.'))
      const handleClose = (): void =>
        finish(new Error('The synchronization relay closed during setup.'))
      const handleUnexpectedResponse = (): void =>
        finish(new Error('The synchronization relay rejected the connection.'))
      const timeout = setTimeout(() => {
        finish(new Error('The synchronization relay connection timed out.'))
      }, this.handshakeTimeoutMs)

      timeout.unref?.()
      this.cancelPendingHandshake = cancelHandshake
      socket.once('open', handleOpen)
      socket.once('error', handleError)
      socket.once('close', handleClose)
      socket.once('unexpected-response', handleUnexpectedResponse)
    })
  }

  private disposeSocket(socket: WebSocket, code: number, reason: string): void {
    socket.removeAllListeners()

    if (
      socket.readyState !== WebSocket.CLOSING &&
      socket.readyState !== WebSocket.CLOSED
    ) {
      socket.close(code, reason)
    }
  }
  private async registerWorkspace(): Promise<void> {
    const verifier = deriveWorkspaceVerifier(
      this.routing.notificationAuthKey,
      this.routing.workspaceRouteId
    )
    const response = await this.fetchWithTimeout(
      this.getWorkspaceUrl('/register'),
      {
        body: JSON.stringify({
          verifier,
          secretVersion: this.routing.secretVersion,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }
    )

    if (!response.ok) {
      throw await this.createRequestError(
        response,
        'The synchronization relay registration failed.'
      )
    }

    this.releaseResponse(response, true)
  }

  private async getConnectionToken(): Promise<string> {
    if (
      this.connectionToken &&
      this.connectionToken.expiresAt > this.now() + TOKEN_REFRESH_WINDOW_MS
    ) {
      return this.connectionToken.token
    }

    const challenge = await this.jsonRequest<RelayChallenge>('/challenges', {
      method: 'POST',
    })
    const workspaceVerifier = deriveWorkspaceVerifier(
      this.routing.notificationAuthKey,
      this.routing.workspaceRouteId
    )
    const proof = createRelayChallengeProof(
      workspaceVerifier,
      this.routing.workspaceRouteId,
      challenge.challengeId,
      challenge.challenge,
      this.deviceId,
      this.routing.secretVersion
    )
    const connectionToken = await this.jsonRequest<RelayConnectionToken>(
      '/tokens',
      {
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          deviceId: this.deviceId,
          proof,
          secretVersion: this.routing.secretVersion,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }
    )

    this.connectionToken = connectionToken

    return connectionToken.token
  }

  private async authorizedJsonRequest<T>(
    path: string,
    init: RequestInit
  ): Promise<T> {
    const response = await this.authorizedRequest(path, init)

    return this.readJsonWithTimeout<T>(response)
  }

  private async authorizedRequest(
    path: string,
    init: RequestInit
  ): Promise<Response> {
    const token = await this.getConnectionToken()
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    const response = await this.fetchWithTimeout(this.getWorkspaceUrl(path), {
      ...init,
      headers,
    })

    if (!response.ok) {
      throw await this.createRequestError(
        response,
        'The synchronization relay request failed.'
      )
    }

    if (response.status === 204) {
      this.releaseResponse(response)
    }

    return response
  }

  private async jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchWithTimeout(this.getWorkspaceUrl(path), {
      ...init,
    })

    if (!response.ok) {
      throw await this.createRequestError(
        response,
        'The synchronization relay authentication failed.'
      )
    }

    return this.readJsonWithTimeout<T>(response)
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort(
        new Error('The synchronization relay request timed out.')
      )
    }, this.requestTimeoutMs)

    timeout.unref?.()
    this.activeRequestControllers.add(controller)

    try {
      const response = await this.fetchImplementation(url, {
        ...init,
        signal: controller.signal,
      })

      this.responseRequests.set(response, { controller, timeout })

      return response
    } catch {
      clearTimeout(timeout)
      this.activeRequestControllers.delete(controller)

      if (controller.signal.reason instanceof Error) {
        throw controller.signal.reason
      }

      throw new Error('The synchronization relay could not be reached.')
    }
  }
  private async readJsonWithTimeout<T>(response: Response): Promise<T> {
    const request = this.responseRequests.get(response)

    const aborted = new Promise<never>((_resolve, reject) => {
      request?.controller.signal.addEventListener(
        'abort',
        () => reject(request.controller.signal.reason),
        { once: true }
      )
    })

    try {
      return (await Promise.race([response.json(), aborted])) as T
    } catch {
      if (request?.controller.signal.reason instanceof Error) {
        throw request.controller.signal.reason
      }

      throw new Error('The synchronization relay response was invalid.')
    } finally {
      this.releaseResponse(response)
    }
  }

  private releaseResponse(response: Response, cancelBody = false): void {
    const request = this.responseRequests.get(response)

    if (!request) {
      return
    }

    clearTimeout(request.timeout)
    this.activeRequestControllers.delete(request.controller)
    this.responseRequests.delete(response)

    if (cancelBody) {
      void response.body?.cancel().catch(() => undefined)
    }
  }
  private async createRequestError(
    response: Response,
    message: string
  ): Promise<RelayRequestError> {
    let code: string | null = null

    try {
      const value = await this.readJsonWithTimeout<{
        error?: { code?: unknown }
      }>(response)

      if (typeof value.error?.code === 'string') {
        code = value.error.code
      }
    } catch {
      // Relay errors may have an empty or intermediary-generated body.
    }

    return new RelayRequestError(response.status, code, message)
  }
  private handleMessage(data: RawData): void {
    const bytes = Buffer.isBuffer(data)
      ? data
      : Buffer.from(data as ArrayBuffer)

    if (bytes.byteLength > MAX_RELAY_MESSAGE_BYTES) {
      this.socket?.close(1009, 'message-too-large')
      return
    }

    let message: unknown

    try {
      message = JSON.parse(bytes.toString('utf8')) as unknown
    } catch {
      return
    }

    if (!message || typeof message !== 'object') {
      return
    }

    const frame = message as Record<string, unknown>

    if (
      frame.protocolVersion !== RELAY_PROTOCOL_VERSION ||
      typeof frame.type !== 'string'
    ) {
      return
    }

    if (frame.type === 'ping') {
      this.socket?.send(
        JSON.stringify({
          type: 'pong',
          protocolVersion: RELAY_PROTOCOL_VERSION,
        })
      )
      return
    }

    if (frame.type === 'workspace-changed') {
      this.onWorkspaceChanged?.()
    }
  }

  private handleDisconnect(socket: WebSocket): void {
    if (this.socket !== socket) {
      return
    }

    this.socket = null
    this.disposeSocket(socket, 1000, 'disconnected')
    this.onDisconnected?.()
  }

  private getWorkspaceUrl(path: string): string {
    const baseUrl = this.baseUrl.replace(/\/$/, '')
    const route = encodeURIComponent(this.routing.workspaceRouteId)

    return `${baseUrl}/v1/workspaces/${route}${path}`
  }

  private getWebSocketUrl(): string {
    const url = new URL(this.getWorkspaceUrl('/connect'))
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    return url.toString()
  }
}
