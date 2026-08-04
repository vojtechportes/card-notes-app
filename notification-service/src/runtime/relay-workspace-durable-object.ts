import { DurableObject } from 'cloudflare:workers'
import {
  HEARTBEAT_INTERVAL_MS,
  MAX_CONNECTIONS_PER_WORKSPACE,
  RELAY_PROTOCOL_VERSION,
  STALE_CONNECTION_MS,
} from '../constants/relay.constants'
import { AuthorizationService } from '../services/authorization.service'
import { HttpResponseService } from '../services/http-response.service'
import { RelayError } from '../services/relay-error'
import { RelayWorkspaceService } from '../services/relay-workspace.service'
import { RequestBodyService } from '../services/request-body.service'
import { SerializedOperationService } from '../services/serialized-operation.service'
import { WebSocketProtocolError } from '../services/websocket-protocol-error'
import { WebSocketProtocolService } from '../services/websocket-protocol.service'
import type { ExchangeChallengeInput } from '../types/exchange-challenge-input'
import type { FinalizeChannelInput } from '../types/finalize-channel-input'
import type { GoogleWebhookInput } from '../types/google-webhook-input'
import type { MetricName } from '../types/metric-name'
import type { NotificationSignal } from '../types/notification-signal'
import type { RegisterWorkspaceInput } from '../types/register-workspace-input'
import type { RelayEnvironment } from '../types/relay-environment'
import type { RelayWorkspaceSnapshot } from '../types/relay-workspace-snapshot'
import type { RotateVerifierInput } from '../types/rotate-verifier-input'
import type { WebSocketAttachment } from '../types/websocket-attachment'

export class RelayWorkspaceDurableObject extends DurableObject<RelayEnvironment> {
  private readonly authorizationService = new AuthorizationService()
  private readonly bodyService = new RequestBodyService()
  private readonly operationQueue = new SerializedOperationService()
  private readonly responseService = new HttpResponseService()
  private readonly webSocketProtocolService = new WebSocketProtocolService()
  private workspaceRouteId: string | null = null
  private workspaceService: RelayWorkspaceService | null = null

  public constructor(state: DurableObjectState, environment: RelayEnvironment) {
    super(state, environment)

    state.blockConcurrencyWhile(async () => {
      const workspaceRouteId =
        await state.storage.get<string>('workspace-route')
      const snapshot =
        await state.storage.get<RelayWorkspaceSnapshot>('workspace')

      if (workspaceRouteId !== undefined) {
        this.workspaceRouteId = workspaceRouteId
        this.workspaceService = new RelayWorkspaceService(
          workspaceRouteId,
          snapshot
        )
      }
    })
  }

  public override fetch(request: Request): Promise<Response> {
    return this.operationQueue.run(() => this.handleFetch(request))
  }

  private async handleFetch(request: Request): Promise<Response> {
    const startedAt = Date.now()

    try {
      await this.initializeWorkspace(request)

      const response = await this.routeRequest(request)

      await this.persistWorkspace()
      await this.scheduleNextAlarm(null)

      return response
    } catch (error) {
      await this.persistWorkspace()

      if (error instanceof RelayError) {
        const metric = this.getErrorMetric(request, error)

        this.incrementMetric(metric)

        return this.responseService.error(
          error.status,
          error.code,
          error.message
        )
      }

      console.error(
        JSON.stringify({
          service: 'notestack-notification-service',
          event: 'workspace_request',
          outcome: 'rejected',
          code: 'internal_error',
          durationMs: Date.now() - startedAt,
        })
      )

      return this.responseService.error(
        500,
        'internal_error',
        'The relay could not process the request'
      )
    }
  }

  public override alarm(): Promise<void> {
    return this.operationQueue.run(() => this.handleAlarm())
  }

  private async handleAlarm(): Promise<void> {
    const service = this.getWorkspaceService()

    service.runMaintenance(this.getConnectedDeviceIds())

    const flushResult = service.flushNotification()
    const now = Date.now()

    if (flushResult.signal) {
      const signalPayload: NotificationSignal = {
        type: 'workspace-changed',
        protocolVersion: RELAY_PROTOCOL_VERSION,
      }
      const signal = JSON.stringify(signalPayload)
      let deliveryCount = 0

      for (const socket of this.ctx.getWebSockets()) {
        if (socket.readyState !== WebSocket.OPEN) {
          continue
        }

        try {
          socket.send(signal)
          deliveryCount += 1
        } catch {
          socket.close(1011, 'delivery-failed')
        }
      }

      this.incrementMetric('broadcasts', Math.max(deliveryCount, 1))
    }

    for (const socket of this.ctx.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as WebSocketAttachment | null

      if (
        attachment === null ||
        !service.isSecretVersionAccepted(attachment.secretVersion) ||
        attachment.lastSeenAt + STALE_CONNECTION_MS <= now
      ) {
        socket.close(1001, 'heartbeat-timeout')
        continue
      }

      try {
        socket.send(
          JSON.stringify({
            type: 'ping',
            protocolVersion: RELAY_PROTOCOL_VERSION,
          })
        )
      } catch {
        socket.close(1011, 'heartbeat-failed')
      }
    }

    await this.persistWorkspace()
    await this.scheduleNextAlarm(flushResult.nextAlarmAt)
  }

  public override async webSocketMessage(
    socket: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    try {
      const result =
        this.webSocketProtocolService.handleIncomingMessage(message)
      const attachment =
        socket.deserializeAttachment() as WebSocketAttachment | null

      if (attachment !== null) {
        attachment.lastSeenAt = Date.now()
        socket.serializeAttachment(attachment)
      }

      if (result.response !== null) {
        socket.send(result.response)
      }
    } catch (error) {
      if (error instanceof WebSocketProtocolError) {
        socket.close(error.closeCode, error.closeReason)
        return
      }

      socket.close(1011, 'message-processing-failed')
    }
  }

  public override webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    return this.operationQueue.run(() =>
      this.handleWebSocketClose(socket, code, reason, wasClean)
    )
  }

  private async handleWebSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    const attachment =
      socket.deserializeAttachment() as WebSocketAttachment | null

    if (
      attachment !== null &&
      !this.hasConnectedDevice(attachment.deviceId, socket)
    ) {
      this.getWorkspaceService().handleDeviceDisconnect(attachment.deviceId)
      await this.persistWorkspace()
    }

    await this.scheduleNextAlarm(null)
  }

  public override webSocketError(socket: WebSocket): Promise<void> {
    return this.operationQueue.run(() => this.handleWebSocketError(socket))
  }

  private async handleWebSocketError(socket: WebSocket): Promise<void> {
    const attachment =
      socket.deserializeAttachment() as WebSocketAttachment | null

    if (
      attachment !== null &&
      !this.hasConnectedDevice(attachment.deviceId, socket)
    ) {
      this.getWorkspaceService().handleDeviceDisconnect(attachment.deviceId)
      await this.persistWorkspace()
    }

    socket.close(1011, 'socket-error')
  }

  private async routeRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const service = this.getWorkspaceService()
    const channelFinalizeMatch = url.pathname.match(
      /\/channels\/([^/]+)\/finalize$/
    )
    const channelDeleteMatch = url.pathname.match(/\/channels\/([^/]+)$/)

    if (request.method === 'POST' && url.pathname.endsWith('/register')) {
      const input =
        await this.bodyService.readJson<RegisterWorkspaceInput>(request)
      const result = await service.registerWorkspace(input)

      return this.responseService.json(result, result.created ? 201 : 200)
    }

    if (request.method === 'POST' && url.pathname.endsWith('/challenges')) {
      return this.responseService.json(service.createChallenge(), 201)
    }

    if (request.method === 'POST' && url.pathname.endsWith('/tokens')) {
      const input =
        await this.bodyService.readJson<ExchangeChallengeInput>(request)
      const result = await service.exchangeChallenge(input)

      this.incrementMetric('authAccepted')

      return this.responseService.json(result, 201)
    }

    if (request.method === 'PUT' && url.pathname.endsWith('/verifier')) {
      const token = this.authorizationService.getBearerToken(request)
      const input =
        await this.bodyService.readJson<RotateVerifierInput>(request)

      await service.rotateVerifier(token, input)

      return this.responseService.noContent()
    }

    if (
      request.method === 'POST' &&
      url.pathname.endsWith('/channels/prepare')
    ) {
      const token = this.authorizationService.getBearerToken(request)
      const result = await service.prepareChannel(
        token,
        this.env.PUBLIC_BASE_URL
      )

      return this.responseService.json(result, 201)
    }

    if (request.method === 'POST' && channelFinalizeMatch !== null) {
      const token = this.authorizationService.getBearerToken(request)
      const input =
        await this.bodyService.readJson<FinalizeChannelInput>(request)

      await service.finalizeChannel(token, channelFinalizeMatch[1], input)

      return this.responseService.noContent()
    }

    if (request.method === 'DELETE' && channelDeleteMatch !== null) {
      const token = this.authorizationService.getBearerToken(request)

      await service.removeChannel(token, channelDeleteMatch[1])

      return this.responseService.noContent()
    }

    if (request.method === 'POST' && url.pathname.endsWith('/renewal-lease')) {
      const token = this.authorizationService.getBearerToken(request)
      const result = await service.acquireRenewalLease(
        token,
        this.getConnectedDeviceIds()
      )

      return this.responseService.json(result, result.owned ? 201 : 200)
    }

    if (
      request.method === 'DELETE' &&
      url.pathname.endsWith('/renewal-lease')
    ) {
      const token = this.authorizationService.getBearerToken(request)
      const leaseId = url.searchParams.get('leaseId')

      if (leaseId === null) {
        throw new RelayError(
          400,
          'missing_lease_id',
          'The renewal lease identifier is required'
        )
      }

      await service.releaseRenewalLease(token, leaseId)

      return this.responseService.noContent()
    }

    if (request.method === 'GET' && url.pathname.endsWith('/connect')) {
      return this.connectWebSocket(request)
    }

    if (
      request.method === 'POST' &&
      url.pathname.includes('/v1/google/webhooks/')
    ) {
      return this.handleWebhook(request)
    }

    return this.responseService.error(
      404,
      'not_found',
      'The endpoint was not found'
    )
  }

  private async connectWebSocket(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      throw new RelayError(
        426,
        'websocket_upgrade_required',
        'A WebSocket upgrade is required'
      )
    }

    if (this.ctx.getWebSockets().length >= MAX_CONNECTIONS_PER_WORKSPACE) {
      throw new RelayError(
        429,
        'connection_limit_reached',
        'The workspace connection limit was reached'
      )
    }

    const token = this.authorizationService.getWebSocketToken(request)
    const device = await this.getWorkspaceService().authorizeConnectionToken(
      token,
      true
    )
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    const now = Date.now()
    const attachment: WebSocketAttachment = {
      deviceId: device.deviceId,
      secretVersion: device.secretVersion,
      connectedAt: now,
      lastSeenAt: now,
    }

    server.serializeAttachment(attachment)
    this.ctx.acceptWebSocket(server, [device.deviceId])
    await this.scheduleNextAlarm(null)

    return new Response(null, {
      status: 101,
      headers: { 'sec-websocket-protocol': 'notestack.relay.v1' },
      webSocket: client,
    })
  }

  private async handleWebhook(request: Request): Promise<Response> {
    if (request.body !== null) {
      throw new RelayError(
        413,
        'webhook_body_not_allowed',
        'Google webhook bodies are not accepted'
      )
    }

    const url = new URL(request.url)
    const pathMatch = url.pathname.match(
      /\/v1\/google\/webhooks\/[^/]+\/([^/]+)$/
    )

    if (pathMatch === null) {
      throw new RelayError(
        404,
        'channel_not_found',
        'The channel was not found'
      )
    }

    const input: GoogleWebhookInput = {
      channelId: request.headers.get('x-goog-channel-id') ?? '',
      resourceId: request.headers.get('x-goog-resource-id') ?? '',
      resourceState: request.headers.get('x-goog-resource-state') ?? '',
      verificationToken: request.headers.get('x-goog-channel-token') ?? '',
      messageNumber: request.headers.get('x-goog-message-number') ?? '',
    }

    if (input.channelId !== pathMatch[1]) {
      throw new RelayError(
        401,
        'channel_mismatch',
        'The webhook channel does not match its route'
      )
    }

    for (const value of Object.values(input)) {
      if (value.length > 1024) {
        throw new RelayError(
          431,
          'webhook_headers_too_large',
          'A webhook header is too large'
        )
      }
    }

    const result = await this.getWorkspaceService().handleGoogleWebhook(input)

    if (result.coalesceAt !== null) {
      await this.scheduleNextAlarm(result.coalesceAt)
    }

    if (result.duplicate) {
      this.incrementMetric('webhookDuplicate')
      return this.responseService.noContent()
    }

    if (result.accepted) {
      this.incrementMetric('webhookAccepted')
    } else {
      this.incrementMetric('rateLimited')
    }

    return this.responseService.noContent(202)
  }

  private async initializeWorkspace(request: Request): Promise<void> {
    const workspaceRouteId = request.headers.get('x-notestack-workspace-route')

    if (workspaceRouteId === null) {
      throw new RelayError(
        400,
        'missing_workspace_route',
        'The workspace route is required'
      )
    }

    if (
      this.workspaceRouteId !== null &&
      this.workspaceRouteId !== workspaceRouteId
    ) {
      throw new RelayError(
        409,
        'workspace_route_mismatch',
        'The workspace route does not match durable state'
      )
    }

    if (this.workspaceService !== null) {
      return
    }

    const snapshot =
      await this.ctx.storage.get<RelayWorkspaceSnapshot>('workspace')

    this.workspaceRouteId = workspaceRouteId
    this.workspaceService = new RelayWorkspaceService(
      workspaceRouteId,
      snapshot
    )
  }

  private getWorkspaceService(): RelayWorkspaceService {
    if (this.workspaceService === null) {
      throw new RelayError(
        503,
        'workspace_not_ready',
        'The workspace relay is not ready'
      )
    }

    return this.workspaceService
  }

  private async persistWorkspace(): Promise<void> {
    if (this.workspaceService !== null) {
      await this.ctx.storage.put({
        'workspace-route': this.workspaceRouteId,
        workspace: this.workspaceService.getSnapshot(),
      })
    }
  }

  private getConnectedDeviceIds(): Set<string> {
    const deviceIds = new Set<string>()

    for (const socket of this.ctx.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as WebSocketAttachment | null

      if (attachment !== null && socket.readyState === WebSocket.OPEN) {
        deviceIds.add(attachment.deviceId)
      }
    }

    return deviceIds
  }

  private hasConnectedDevice(
    deviceId: string,
    excludedSocket: WebSocket
  ): boolean {
    return this.ctx.getWebSockets().some((socket) => {
      if (socket === excludedSocket || socket.readyState !== WebSocket.OPEN) {
        return false
      }

      const attachment =
        socket.deserializeAttachment() as WebSocketAttachment | null

      return attachment?.deviceId === deviceId
    })
  }

  private async scheduleNextAlarm(
    notificationAt: number | null
  ): Promise<void> {
    const heartbeatAt =
      this.ctx.getWebSockets().length > 0
        ? Date.now() + HEARTBEAT_INTERVAL_MS
        : null
    const maintenanceAt = this.workspaceService?.getNextMaintenanceAt() ?? null
    let nextAlarmAt = notificationAt

    if (
      nextAlarmAt === null ||
      (heartbeatAt !== null && heartbeatAt < nextAlarmAt)
    ) {
      nextAlarmAt = heartbeatAt
    }

    if (
      nextAlarmAt === null ||
      (maintenanceAt !== null && maintenanceAt < nextAlarmAt)
    ) {
      nextAlarmAt = maintenanceAt
    }

    if (nextAlarmAt === null) {
      await this.ctx.storage.deleteAlarm()
      return
    }

    const currentAlarm = await this.ctx.storage.getAlarm()

    if (currentAlarm === null || nextAlarmAt < currentAlarm) {
      await this.ctx.storage.setAlarm(nextAlarmAt)
    }
  }

  private getErrorMetric(request: Request, error: RelayError): MetricName {
    if (error.code === 'rate_limited') {
      return 'rateLimited'
    }

    if (new URL(request.url).pathname.startsWith('/v1/google/webhooks/')) {
      return 'webhookRejected'
    }

    return 'authRejected'
  }

  private incrementMetric(metric: MetricName, count = 1): void {
    const id = this.env.METRICS.idFromName('global')
    const stub = this.env.METRICS.get(id)

    this.ctx.waitUntil(
      stub.fetch('https://metrics.internal/_increment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metric, count }),
      })
    )
  }
}
