import { describe, expect, it } from 'vitest'
import {
  CHANNEL_MAX_LIFETIME_MS,
  CHANNEL_PREPARATION_TTL_MS,
} from '../src/constants/relay.constants'
import { RelayWorkspaceHarness } from './relay-workspace-harness'

describe('Google notification channel lifecycle', () => {
  it('prepares a channel with a one-time raw token and persists only its hash', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const prepared = await harness.service.prepareChannel(
      connectionToken.token,
      'https://notifications.notestack.app/'
    )
    const snapshotText = JSON.stringify(harness.service.getSnapshot())

    expect(prepared.webhookUrl).toBe(
      `https://notifications.notestack.app/v1/google/webhooks/${harness.routeId}/${prepared.channelId}`
    )
    expect(prepared.preparationExpiresAt).toBe(
      harness.now + CHANNEL_PREPARATION_TTL_MS
    )
    expect(snapshotText).not.toContain(prepared.verificationToken)
  })

  it('finalizes idempotently and permits overlapping replacement channels', async () => {
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
    const expiration = harness.now + CHANNEL_MAX_LIFETIME_MS

    await harness.service.finalizeChannel(
      connectionToken.token,
      first.channelId,
      {
        resourceId: 'opaque-resource-one',
        expiresAt: expiration,
      }
    )
    await harness.service.finalizeChannel(
      connectionToken.token,
      first.channelId,
      {
        resourceId: 'opaque-resource-one',
        expiresAt: expiration,
      }
    )
    await harness.service.finalizeChannel(
      connectionToken.token,
      second.channelId,
      {
        resourceId: 'opaque-resource-two',
        expiresAt: expiration,
      }
    )

    expect(Object.keys(harness.service.getSnapshot().channels)).toHaveLength(2)
  })

  it('rejects conflicting finalization and removes expired preparations', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const prepared = await harness.service.prepareChannel(
      connectionToken.token,
      'https://relay.test'
    )
    const expiration = harness.now + 60_000

    await harness.service.finalizeChannel(
      connectionToken.token,
      prepared.channelId,
      {
        resourceId: 'opaque-resource-one',
        expiresAt: expiration,
      }
    )

    await expect(
      harness.service.finalizeChannel(
        connectionToken.token,
        prepared.channelId,
        {
          resourceId: 'opaque-resource-two',
          expiresAt: expiration,
        }
      )
    ).rejects.toMatchObject({ code: 'channel_already_finalized' })

    harness.now = expiration + 1

    await expect(
      harness.service.handleGoogleWebhook({
        channelId: prepared.channelId,
        resourceId: 'opaque-resource-one',
        resourceState: 'change',
        verificationToken: prepared.verificationToken,
        messageNumber: '1',
      })
    ).rejects.toMatchObject({ code: 'channel_not_found' })
  })
})
