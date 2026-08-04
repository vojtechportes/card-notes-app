import {
  MAX_REQUEST_BODY_BYTES,
  WORKSPACE_ROUTE_ID_PATTERN,
} from '../constants/relay.constants'
import type { RelayEnvironment } from '../types/relay-environment'
import { HttpResponseService } from './http-response.service'
import { StructuredLoggerService } from './structured-logger.service'

export class RelayWorkerService {
  private readonly responseService = new HttpResponseService()
  private readonly logger = new StructuredLoggerService()

  public async handle(
    request: Request,
    environment: RelayEnvironment
  ): Promise<Response> {
    const startedAt = Date.now()
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/healthz') {
      return this.responseService.json({ status: 'ok' })
    }

    if (request.method === 'GET' && url.pathname === '/readyz') {
      return this.handleReadiness(environment)
    }

    if (request.method === 'GET' && url.pathname === '/metrics') {
      if (!this.isMetricsRequestAuthorized(request, environment)) {
        return this.responseService.error(
          401,
          'metrics_unauthorized',
          'Metrics authorization is required'
        )
      }

      return this.getMetricsStub(environment).fetch(
        'https://metrics.internal/_metrics'
      )
    }

    const workspaceRouteId = this.getWorkspaceRouteId(url.pathname)

    if (workspaceRouteId === null) {
      return this.responseService.error(
        404,
        'not_found',
        'The endpoint was not found'
      )
    }

    const declaredLength = Number(request.headers.get('content-length') ?? '0')

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_REQUEST_BODY_BYTES
    ) {
      return this.responseService.error(
        413,
        'request_too_large',
        'The request body is too large'
      )
    }

    const headers = new Headers(request.headers)

    headers.set('x-notestack-workspace-route', workspaceRouteId)

    const id = environment.WORKSPACES.idFromName(workspaceRouteId)
    const stub = environment.WORKSPACES.get(id)
    const response = await stub.fetch(new Request(request, { headers }))

    this.logger.write({
      event: 'relay_request',
      outcome:
        response.ok || response.status === 101 ? 'completed' : 'rejected',
      code: String(response.status),
      durationMs: Date.now() - startedAt,
    })

    return response
  }

  private async handleReadiness(
    environment: RelayEnvironment
  ): Promise<Response> {
    try {
      const response = await this.getMetricsStub(environment).fetch(
        'https://metrics.internal/_ready'
      )

      if (!response.ok) {
        throw new Error('Durable metrics state was unavailable')
      }

      return this.responseService.json({ status: 'ready' })
    } catch {
      return this.responseService.json({ status: 'not-ready' }, 503)
    }
  }

  private getWorkspaceRouteId(pathname: string): string | null {
    const routeMatch = pathname.match(
      /^\/v1\/(?:workspaces\/([^/]+)|google\/webhooks\/([^/]+)\/[^/]+)(?:\/|$)/
    )
    const workspaceRouteId = routeMatch?.[1] ?? routeMatch?.[2]

    if (
      workspaceRouteId === undefined ||
      !WORKSPACE_ROUTE_ID_PATTERN.test(workspaceRouteId)
    ) {
      return null
    }

    return workspaceRouteId
  }

  private getMetricsStub(environment: RelayEnvironment) {
    const id = environment.METRICS.idFromName('global')

    return environment.METRICS.get(id)
  }

  private isMetricsRequestAuthorized(
    request: Request,
    environment: RelayEnvironment
  ): boolean {
    if (environment.METRICS_AUTH_TOKEN === undefined) {
      return false
    }

    return (
      request.headers.get('authorization') ===
      `Bearer ${environment.METRICS_AUTH_TOKEN}`
    )
  }
}
