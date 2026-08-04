import { RelayCryptoService } from '../src/services/relay-crypto.service'
import { RelayWorkspaceService } from '../src/services/relay-workspace.service'
import type { ConnectionTokenResponse } from '../src/types/connection-token-response'

export class RelayWorkspaceHarness {
  public readonly authKey: string
  public readonly cryptoService = new RelayCryptoService()
  public readonly deviceId = 'b8ab7e18-a4bf-4db0-91a2-d25d77611de5'
  public readonly routeId = 'workspace_route_0123456789abcdef'
  public now = Date.parse('2026-08-03T12:00:00.000Z')
  public service = new RelayWorkspaceService(this.routeId, undefined, {
    now: () => this.now,
  })
  public verifier = ''

  public constructor() {
    this.authKey = this.cryptoService.createRandomToken()
  }

  public async register(secretVersion = 1): Promise<void> {
    this.verifier = await this.cryptoService.deriveWorkspaceVerifier(
      this.authKey,
      this.routeId
    )
    await this.service.registerWorkspace({
      verifier: this.verifier,
      secretVersion,
    })
  }

  public async authenticate(
    secretVersion = 1,
    verifier = this.verifier,
    deviceId = this.deviceId
  ): Promise<ConnectionTokenResponse> {
    const challenge = this.service.createChallenge()
    const verifierHash = await this.cryptoService.hashOpaqueValue(verifier)
    const payload = this.service.createProofPayload(
      challenge.challengeId,
      challenge.challenge,
      deviceId,
      secretVersion
    )
    const proof = await this.cryptoService.createChallengeProof(
      verifierHash,
      payload
    )

    return this.service.exchangeChallenge({
      challengeId: challenge.challengeId,
      deviceId,
      secretVersion,
      proof,
    })
  }
}
