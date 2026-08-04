import { describe, expect, it } from 'vitest'
import { NOTIFICATION_COALESCE_MS } from '../src/constants/relay.constants'
import { RelayWorkspaceService } from '../src/services/relay-workspace.service'
import { RelayWorkspaceHarness } from './relay-workspace-harness'

describe('Google webhook validation and notification coalescing', () => {
  it('rejects spoofed tokens, resources, and channel routes', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const channel = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )

    await harness.service.finalizeChannel(
      connectionToken.token,
      channel.channelId,
      {
        resourceId: 'opaque-resource',
        expiresAt: harness.now + 60_000,
      }
    )

    await expect(
      harness.service.handleGoogleWebhook({
        channelId: channel.channelId,
        resourceId: 'opaque-resource',
        resourceState: 'change',
        verificationToken: harness.cryptoService.createRandomToken(),
        messageNumber: '1',
      })
    ).rejects.toMatchObject({ code: 'verification_token_mismatch' })

    await expect(
      harness.service.handleGoogleWebhook({
        channelId: channel.channelId,
        resourceId: 'wrong-resource',
        resourceState: 'change',
        verificationToken: channel.verificationToken,
        messageNumber: '1',
      })
    ).rejects.toMatchObject({ code: 'resource_mismatch' })
  })

  it('deduplicates message numbers and coalesces bursts across overlapping channels', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const first = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )
    const second = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )

    await harness.service.finalizeChannel(
      connectionToken.token,
      first.channelId,
      {
        resourceId: 'resource-one',
        expiresAt: harness.now + 60_000,
      }
    )
    await harness.service.finalizeChannel(
      connectionToken.token,
      second.channelId,
      {
        resourceId: 'resource-two',
        expiresAt: harness.now + 60_000,
      }
    )

    const firstResult = await harness.service.handleGoogleWebhook({
      channelId: first.channelId,
      resourceId: 'resource-one',
      resourceState: 'change',
      verificationToken: first.verificationToken,
      messageNumber: '10',
    })
    const duplicateResult = await harness.service.handleGoogleWebhook({
      channelId: first.channelId,
      resourceId: 'resource-one',
      resourceState: 'change',
      verificationToken: first.verificationToken,
      messageNumber: '10',
    })
    const overlapResult = await harness.service.handleGoogleWebhook({
      channelId: second.channelId,
      resourceId: 'resource-two',
      resourceState: 'sync',
      verificationToken: second.verificationToken,
      messageNumber: '1',
    })

    expect(firstResult.coalesceAt).toBe(harness.now + NOTIFICATION_COALESCE_MS)
    expect(duplicateResult.duplicate).toBe(true)
    expect(overlapResult.coalesceAt).toBe(firstResult.coalesceAt)
    expect(harness.service.flushNotification()).toEqual({
      signal: false,
      nextAlarmAt: firstResult.coalesceAt,
    })

    harness.now += NOTIFICATION_COALESCE_MS

    expect(harness.service.flushNotification()).toEqual({
      signal: true,
      nextAlarmAt: null,
    })
    expect(harness.service.flushNotification()).toEqual({
      signal: false,
      nextAlarmAt: null,
    })
  })

  it('acknowledges but drops work above the per-workspace webhook rate limit', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const channel = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )

    await harness.service.finalizeChannel(
      connectionToken.token,
      channel.channelId,
      {
        resourceId: 'opaque-resource',
        expiresAt: harness.now + 60_000,
      }
    )

    for (let messageNumber = 1; messageNumber <= 300; messageNumber += 1) {
      const result = await harness.service.handleGoogleWebhook({
        channelId: channel.channelId,
        resourceId: 'opaque-resource',
        resourceState: 'change',
        verificationToken: channel.verificationToken,
        messageNumber: String(messageNumber),
      })

      expect(result.accepted).toBe(true)
    }

    await expect(
      harness.service.handleGoogleWebhook({
        channelId: channel.channelId,
        resourceId: 'opaque-resource',
        resourceState: 'change',
        verificationToken: channel.verificationToken,
        messageNumber: '301',
      })
    ).resolves.toMatchObject({ accepted: false, duplicate: false })
  })

  it('rehydrates durable state so another worker instance validates and coalesces the same route', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const channel = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )

    await harness.service.finalizeChannel(
      connectionToken.token,
      channel.channelId,
      {
        resourceId: 'opaque-resource',
        expiresAt: harness.now + 60_000,
      }
    )

    const rehydrated = new RelayWorkspaceService(
      harness.routeId,
      harness.service.getSnapshot(),
      { now: () => harness.now }
    )
    const result = await rehydrated.handleGoogleWebhook({
      channelId: channel.channelId,
      resourceId: 'opaque-resource',
      resourceState: 'change',
      verificationToken: channel.verificationToken,
      messageNumber: '1',
    })

    expect(result.accepted).toBe(true)
    expect(rehydrated.getSnapshot().pendingNotificationAt).toBe(
      harness.now + NOTIFICATION_COALESCE_MS
    )
  })
  it('bounds spoof attempts before cryptographic validation and recovers next window', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const channel = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )

    await harness.service.finalizeChannel(
      connectionToken.token,
      channel.channelId,
      {
        resourceId: 'opaque-resource',
        expiresAt: harness.now + 120_000,
      }
    )

    for (let attempt = 1; attempt <= 600; attempt += 1) {
      await expect(
        harness.service.handleGoogleWebhook({
          channelId: channel.channelId,
          resourceId: 'opaque-resource',
          resourceState: 'change',
          verificationToken: harness.cryptoService.createRandomToken(),
          messageNumber: String(attempt),
        })
      ).rejects.toMatchObject({ code: 'verification_token_mismatch' })
    }

    const validWebhook = {
      channelId: channel.channelId,
      resourceId: 'opaque-resource',
      resourceState: 'change',
      verificationToken: channel.verificationToken,
      messageNumber: '601',
    }

    await expect(
      harness.service.handleGoogleWebhook(validWebhook)
    ).rejects.toMatchObject({ code: 'rate_limited' })

    harness.now += 60_001

    await expect(
      harness.service.handleGoogleWebhook(validWebhook)
    ).resolves.toMatchObject({ accepted: true })
  })
})
