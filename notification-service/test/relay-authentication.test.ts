import { describe, expect, it } from 'vitest'
import { CHALLENGE_TTL_MS } from '../src/constants/relay.constants'
import { RelayWorkspaceHarness } from './relay-workspace-harness'

describe('relay workspace authentication', () => {
  it('registers a route idempotently without persisting the raw workspace secret or verifier', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const secondRegistration = await harness.service.registerWorkspace({
      verifier: harness.verifier,
      secretVersion: 1,
    })
    const persisted = JSON.stringify(harness.service.getSnapshot())

    expect(secondRegistration).toEqual({ created: false, secretVersion: 1 })
    expect(persisted).not.toContain(harness.authKey)
    expect(persisted).not.toContain(harness.verifier)
    expect(harness.service.getSnapshot().currentVerifier?.verifierHash).toMatch(
      /^[A-Za-z0-9_-]{43}$/
    )
  })

  it('rejects route squatting after a verifier has been bound', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()

    await expect(
      harness.service.registerWorkspace({
        verifier: harness.cryptoService.createRandomToken(),
        secretVersion: 1,
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'workspace_already_registered',
    })
  })

  it('exchanges a valid one-time challenge for a short-lived device token', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const connectionToken = await harness.authenticate()
    const device = await harness.service.authorizeConnectionToken(
      connectionToken.token,
      true
    )

    expect(device.deviceId).toBe(harness.deviceId)
    expect(connectionToken.expiresAt).toBeGreaterThan(harness.now)
    await expect(
      harness.service.authorizeConnectionToken(connectionToken.token, true)
    ).rejects.toMatchObject({ code: 'connection_token_replayed' })
  })

  it('rejects invalid, replayed, and expired challenges', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const challenge = harness.service.createChallenge()

    await expect(
      harness.service.exchangeChallenge({
        challengeId: challenge.challengeId,
        deviceId: harness.deviceId,
        secretVersion: 1,
        proof: harness.cryptoService.createRandomToken(),
      })
    ).rejects.toMatchObject({ code: 'invalid_challenge_proof' })

    await expect(
      harness.service.exchangeChallenge({
        challengeId: challenge.challengeId,
        deviceId: harness.deviceId,
        secretVersion: 1,
        proof: harness.cryptoService.createRandomToken(),
      })
    ).rejects.toMatchObject({ code: 'challenge_replayed' })

    const expiringChallenge = harness.service.createChallenge()
    harness.now += CHALLENGE_TTL_MS + 1

    await expect(
      harness.service.exchangeChallenge({
        challengeId: expiringChallenge.challengeId,
        deviceId: harness.deviceId,
        secretVersion: 1,
        proof: harness.cryptoService.createRandomToken(),
      })
    ).rejects.toMatchObject({ code: 'challenge_expired' })
  })

  it('supports a bounded previous-verifier rollover window', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const token = await harness.authenticate()
    const previousVerifier = harness.verifier
    const nextAuthKey = harness.cryptoService.createRandomToken()
    const nextVerifier = await harness.cryptoService.deriveWorkspaceVerifier(
      nextAuthKey,
      harness.routeId
    )
    const rolloverUntil = harness.now + 60_000

    await harness.service.rotateVerifier(token.token, {
      verifier: nextVerifier,
      secretVersion: 2,
      rolloverUntil,
    })

    await expect(
      harness.authenticate(1, previousVerifier)
    ).resolves.toBeDefined()
    await expect(harness.authenticate(2, nextVerifier)).resolves.toBeDefined()

    harness.now = rolloverUntil + 1

    await expect(
      harness.service.authorizeConnectionToken(token.token)
    ).rejects.toMatchObject({
      code: 'unknown_secret_version',
    })
    await expect(
      harness.authenticate(1, previousVerifier)
    ).rejects.toMatchObject({
      code: 'unknown_secret_version',
    })
  })
})
