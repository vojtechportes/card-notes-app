import { describe, expect, it, vi } from 'vitest'
import { RelayWorkerService } from '../src/services/relay-worker.service'
import type { RelayEnvironment } from '../src/types/relay-environment'

describe('relay worker routing and operations endpoints', () => {
  it('serves liveness without touching durable state', async () => {
    const service = new RelayWorkerService()
    const response = await service.handle(
      new Request('https://relay.test/healthz'),
      {} as RelayEnvironment
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('routes every request for one workspace through the same durable object name', async () => {
    const service = new RelayWorkerService()
    const durableFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    const idFromName = vi.fn((name: string) => name)
    const get = vi.fn(() => ({ fetch: durableFetch }))
    const environment = {
      WORKSPACES: { idFromName, get },
      PUBLIC_BASE_URL: 'https://relay.test',
    } as unknown as RelayEnvironment
    const routeId = 'workspace_route_0123456789abcdef'

    await service.handle(
      new Request(`https://relay.test/v1/workspaces/${routeId}/challenges`, {
        method: 'POST',
      }),
      environment
    )
    await service.handle(
      new Request(
        `https://relay.test/v1/google/webhooks/${routeId}/channel-id`,
        {
          method: 'POST',
        }
      ),
      environment
    )

    expect(idFromName).toHaveBeenNthCalledWith(1, routeId)
    expect(idFromName).toHaveBeenNthCalledWith(2, routeId)

    const otherRouteId = 'workspace_route_fedcba9876543210'

    await service.handle(
      new Request(
        `https://relay.test/v1/workspaces/${otherRouteId}/challenges`,
        {
          method: 'POST',
        }
      ),
      environment
    )

    expect(idFromName).toHaveBeenNthCalledWith(3, otherRouteId)
    expect(get).toHaveBeenCalledTimes(3)

    const forwardedRequest = durableFetch.mock.calls[0][0] as Request

    expect(forwardedRequest.headers.get('x-notestack-workspace-route')).toBe(
      routeId
    )
  })

  it('fails readiness when durable state is unavailable and protects metrics', async () => {
    const service = new RelayWorkerService()
    const environment = {
      METRICS: {
        idFromName: vi.fn(() => 'metrics'),
        get: vi.fn(() => ({
          fetch: vi.fn().mockRejectedValue(new Error('unavailable')),
        })),
      },
      METRICS_AUTH_TOKEN: 'metrics-secret',
    } as unknown as RelayEnvironment

    const readiness = await service.handle(
      new Request('https://relay.test/readyz'),
      environment
    )
    const metrics = await service.handle(
      new Request('https://relay.test/metrics'),
      environment
    )

    expect(readiness.status).toBe(503)
    expect(metrics.status).toBe(401)
  })
})
