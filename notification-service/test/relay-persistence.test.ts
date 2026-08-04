import { describe, expect, it } from 'vitest'
import { RelayWorkspaceHarness } from './relay-workspace-harness'

describe('relay persistence boundary', () => {
  it('contains only allowlisted opaque routing and operational state', async () => {
    const harness = new RelayWorkspaceHarness()

    await harness.register()
    const token = await harness.authenticate()
    const channel = await harness.service.prepareChannel(
      token.token,
      'https://relay.test'
    )

    await harness.service.finalizeChannel(token.token, channel.channelId, {
      resourceId: 'opaque-resource',
      expiresAt: harness.now + 60_000,
    })

    const persisted = JSON.stringify(harness.service.getSnapshot())
    const forbiddenTerms = [
      'note',
      'setting',
      'asset',
      'oauth',
      'accessToken',
      'refreshToken',
      'accountId',
      'email',
      'providerCredential',
    ]

    for (const forbiddenTerm of forbiddenTerms) {
      expect(persisted.toLowerCase()).not.toContain(forbiddenTerm.toLowerCase())
    }

    expect(persisted).not.toContain(harness.authKey)
    expect(persisted).not.toContain(harness.verifier)
    expect(persisted).not.toContain(token.token)
    expect(persisted).not.toContain(channel.verificationToken)
  })
})
