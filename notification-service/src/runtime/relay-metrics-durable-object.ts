import { DurableObject } from 'cloudflare:workers'
import type { MetricCounters } from '../types/metric-counters'
import type { MetricName } from '../types/metric-name'
import type { RelayEnvironment } from '../types/relay-environment'
import { HttpResponseService } from '../services/http-response.service'

const EMPTY_COUNTERS: MetricCounters = {
  authAccepted: 0,
  authRejected: 0,
  webhookAccepted: 0,
  webhookRejected: 0,
  webhookDuplicate: 0,
  broadcasts: 0,
  rateLimited: 0,
}

export class RelayMetricsDurableObject extends DurableObject<RelayEnvironment> {
  private readonly responseService = new HttpResponseService()
  private counters: MetricCounters = { ...EMPTY_COUNTERS }

  public constructor(state: DurableObjectState, environment: RelayEnvironment) {
    super(state, environment)

    state.blockConcurrencyWhile(async () => {
      this.counters = (await state.storage.get<MetricCounters>('counters')) ?? {
        ...EMPTY_COUNTERS,
      }
    })
  }

  public override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/_increment') {
      const body = (await request.json()) as {
        metric?: MetricName
        count?: number
      }

      if (body.metric === undefined || !(body.metric in this.counters)) {
        return this.responseService.error(
          400,
          'invalid_metric',
          'The metric is invalid'
        )
      }

      const increment =
        Number.isSafeInteger(body.count) && Number(body.count) > 0
          ? Number(body.count)
          : 1

      this.counters[body.metric] += increment
      await this.ctx.storage.put('counters', this.counters)

      return this.responseService.noContent()
    }

    if (request.method === 'GET' && url.pathname === '/_ready') {
      await this.ctx.storage.get('counters')

      return this.responseService.json({ ready: true })
    }

    if (request.method === 'GET' && url.pathname === '/_metrics') {
      return new Response(this.toPrometheusText(), {
        headers: {
          'cache-control': 'no-store',
          'content-type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      })
    }

    return this.responseService.error(
      404,
      'not_found',
      'The endpoint was not found'
    )
  }

  private toPrometheusText(): string {
    const lines = [
      '# HELP notestack_relay_events_total Content-free relay operational events.',
      '# TYPE notestack_relay_events_total counter',
    ]

    for (const [event, count] of Object.entries(this.counters)) {
      lines.push(`notestack_relay_events_total{event="${event}"} ${count}`)
    }

    return `${lines.join('\n')}\n`
  }
}
