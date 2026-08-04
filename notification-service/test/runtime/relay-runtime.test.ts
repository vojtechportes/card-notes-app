import { env, exports } from 'cloudflare:workers'
import { runDurableObjectAlarm } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { RelayRuntimeHarness } from './relay-runtime-harness'

describe('notification relay Durable Object runtime', () => {
  it('serializes concurrent replay attempts against one challenge', async () => {
    const harness = new RelayRuntimeHarness(
      'concurrency_0123456789abcdef',
      'b8ab7e18-a4bf-4db0-91a2-d25d77611de5'
    )

    expect((await harness.register()).status).toBe(201)

    const challenge = await harness.createChallenge()
    const request = await harness.createTokenRequest(challenge)
    const tokenUrl = `https://notifications.notestack.app/v1/workspaces/${harness.routeId}/tokens`
    const responses = await Promise.all([
      exports.default.fetch(tokenUrl, request),
      exports.default.fetch(tokenUrl, request),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 401,
    ])
  })

  it('isolates broadcasts and accepts authenticated reconnects', async () => {
    const first = new RelayRuntimeHarness(
      'broadcast_a_0123456789abcdef',
      'b8ab7e18-a4bf-4db0-91a2-d25d77611de5'
    )
    const second = new RelayRuntimeHarness(
      'broadcast_b_0123456789abcdef',
      '14138a0f-1a97-4cd4-b10d-bfb07628379a'
    )

    await first.register()
    await second.register()

    const firstToken = await first.authenticate()
    const secondToken = await second.authenticate()
    const firstSocket = await first.connect(firstToken.token)
    const secondSocket = await second.connect(secondToken.token)
    const secondMessages: string[] = []

    secondSocket.addEventListener('message', (event) => {
      secondMessages.push(String(event.data))
    })

    const channel = await first.prepareChannel(firstToken.token)
    const resourceId = 'opaque-google-resource'

    expect(
      (
        await first.finalizeChannel(
          firstToken.token,
          channel.channelId,
          resourceId
        )
      ).status
    ).toBe(204)

    const messagePromise = new Promise<string>((resolve) => {
      firstSocket.addEventListener('message', (event) => {
        const message = String(event.data)

        if (message.includes('workspace-changed')) {
          resolve(message)
        }
      })
    })
    const firstStub = env.WORKSPACES.getByName(first.routeId)

    expect((await first.sendWebhook(channel, resourceId, '1')).status).toBe(202)
    expect((await first.sendWebhook(channel, resourceId, '1')).status).toBe(204)
    expect(
      (
        await first.sendWebhook(
          channel,
          resourceId,
          '2',
          first.cryptoService.createRandomToken()
        )
      ).status
    ).toBe(401)
    await scheduler.wait(550)
    expect(await runDurableObjectAlarm(firstStub)).toBe(true)
    await expect(messagePromise).resolves.toContain('"protocolVersion":1')
    await scheduler.wait(10)

    expect(secondMessages).toEqual([])

    await scheduler.wait(10)
    const metricsResponse = await exports.default.fetch(
      'https://notifications.notestack.app/metrics',
      {
        headers: {
          authorization: 'Bearer runtime-test-metrics-token',
        },
      }
    )
    const metricsText = await metricsResponse.text()

    expect(metricsText).toMatch(/event="webhookRejected"} [1-9][0-9]*/)
    expect(metricsText).toMatch(/event="webhookDuplicate"} [1-9][0-9]*/)
    expect(metricsText).toMatch(/event="broadcasts"} [1-9][0-9]*/)
    firstSocket.close(1000, 'prepare-reconnect')
    await scheduler.wait(10)

    const reconnectToken = await first.authenticate()
    const reconnectedSocket = await first.connect(reconnectToken.token)
    const reconnectMessage = new Promise<string>((resolve) => {
      reconnectedSocket.addEventListener('message', (event) => {
        const message = String(event.data)

        if (message.includes('workspace-changed')) {
          resolve(message)
        }
      })
    })

    expect((await first.sendWebhook(channel, resourceId, '3')).status).toBe(202)
    await scheduler.wait(550)
    expect(await runDurableObjectAlarm(firstStub)).toBe(true)
    await expect(reconnectMessage).resolves.toContain('workspace-changed')

    reconnectedSocket.close(1000, 'test-complete')
    secondSocket.close(1000, 'test-complete')
  })
})
