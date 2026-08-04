import { describe, expect, it } from 'vitest'
import { RENEWAL_LEASE_TTL_MS } from '../src/constants/relay.constants'
import { RelayWorkspaceHarness } from './relay-workspace-harness'

describe('channel renewal leases', () => {
  it('requires a connected device and grants exactly one owner', async () => {
    const harness = new RelayWorkspaceHarness()
    const secondDeviceId = '14138a0f-1a97-4cd4-b10d-bfb07628379a'

    await harness.register()
    const firstToken = await harness.authenticate()
    const secondToken = await harness.authenticate(
      1,
      harness.verifier,
      secondDeviceId
    )

    await expect(
      harness.service.acquireRenewalLease(firstToken.token, new Set())
    ).rejects.toMatchObject({ code: 'device_not_connected' })

    await harness.service.authorizeConnectionToken(firstToken.token, true)
    await harness.service.authorizeConnectionToken(secondToken.token, true)

    const connectedDevices = new Set([harness.deviceId, secondDeviceId])
    const firstLease = await harness.service.acquireRenewalLease(
      firstToken.token,
      connectedDevices
    )
    const secondLease = await harness.service.acquireRenewalLease(
      secondToken.token,
      connectedDevices
    )

    expect(firstLease.owned).toBe(true)
    expect(secondLease).toMatchObject({
      leaseId: firstLease.leaseId,
      deviceId: harness.deviceId,
      owned: false,
    })
  })

  it('recovers lease ownership after owner disconnect and expiration', async () => {
    const harness = new RelayWorkspaceHarness()
    const secondDeviceId = '14138a0f-1a97-4cd4-b10d-bfb07628379a'

    await harness.register()
    const firstToken = await harness.authenticate()
    const secondToken = await harness.authenticate(
      1,
      harness.verifier,
      secondDeviceId
    )

    await harness.service.authorizeConnectionToken(firstToken.token, true)
    await harness.service.authorizeConnectionToken(secondToken.token, true)

    const connectedDevices = new Set([harness.deviceId, secondDeviceId])

    await harness.service.acquireRenewalLease(
      firstToken.token,
      connectedDevices
    )
    harness.service.handleDeviceDisconnect(harness.deviceId)

    const reassigned = await harness.service.acquireRenewalLease(
      secondToken.token,
      new Set([secondDeviceId])
    )

    expect(reassigned).toMatchObject({ deviceId: secondDeviceId, owned: true })

    harness.now += RENEWAL_LEASE_TTL_MS + 1

    const reacquired = await harness.service.acquireRenewalLease(
      firstToken.token,
      connectedDevices
    )

    expect(reacquired).toMatchObject({
      deviceId: harness.deviceId,
      owned: true,
    })
  })
})
