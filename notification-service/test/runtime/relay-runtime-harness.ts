import { exports } from 'cloudflare:workers'
import { RelayCryptoService } from '../../src/services/relay-crypto.service'
import type { ChallengeResponse } from '../../src/types/challenge-response'
import type { ConnectionTokenResponse } from '../../src/types/connection-token-response'
import type { PreparedChannel } from '../../src/types/prepared-channel'

export class RelayRuntimeHarness {
  public readonly authKey: string
  public readonly cryptoService = new RelayCryptoService()
  public readonly deviceId: string
  public readonly routeId: string
  public verifier = ''

  public constructor(routeSuffix: string, deviceId: string) {
    this.routeId = `workspace_route_${routeSuffix}`
    this.deviceId = deviceId
    this.authKey = this.cryptoService.createRandomToken()
  }

  public async register(): Promise<Response> {
    this.verifier = await this.cryptoService.deriveWorkspaceVerifier(
      this.authKey,
      this.routeId
    )

    return exports.default.fetch(
      `https://notifications.notestack.app/v1/workspaces/${this.routeId}/register`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ verifier: this.verifier, secretVersion: 1 }),
      }
    )
  }

  public async createChallenge(): Promise<ChallengeResponse> {
    const response = await exports.default.fetch(
      `https://notifications.notestack.app/v1/workspaces/${this.routeId}/challenges`,
      { method: 'POST' }
    )

    return response.json<ChallengeResponse>()
  }

  public async createTokenRequest(
    challenge: ChallengeResponse
  ): Promise<RequestInit> {
    const verifierHash = await this.cryptoService.hashOpaqueValue(this.verifier)
    const proofPayload = [
      'notestack-relay-challenge-v1',
      this.routeId,
      challenge.challengeId,
      challenge.challenge,
      this.deviceId,
      '1',
    ].join(':')
    const proof = await this.cryptoService.createChallengeProof(
      verifierHash,
      proofPayload
    )

    return {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        deviceId: this.deviceId,
        secretVersion: 1,
        proof,
      }),
    }
  }

  public async authenticate(): Promise<ConnectionTokenResponse> {
    const challenge = await this.createChallenge()
    const request = await this.createTokenRequest(challenge)
    const response = await exports.default.fetch(
      `https://notifications.notestack.app/v1/workspaces/${this.routeId}/tokens`,
      request
    )

    return response.json<ConnectionTokenResponse>()
  }

  public async connect(token: string): Promise<WebSocket> {
    const response = await exports.default.fetch(
      `https://notifications.notestack.app/v1/workspaces/${this.routeId}/connect`,
      {
        headers: {
          upgrade: 'websocket',
          'sec-websocket-protocol': `notestack.relay.v1, notestack.token.${token}`,
        },
      }
    )
    const socket = response.webSocket

    if (response.status !== 101 || socket === null) {
      throw new Error(`WebSocket connection failed with ${response.status}`)
    }

    socket.accept()

    return socket
  }

  public async prepareChannel(token: string): Promise<PreparedChannel> {
    const response = await exports.default.fetch(
      `https://notifications.notestack.app/v1/workspaces/${this.routeId}/channels/prepare`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }
    )

    return response.json<PreparedChannel>()
  }

  public finalizeChannel(
    token: string,
    channelId: string,
    resourceId: string
  ): Promise<Response> {
    return exports.default.fetch(
      `https://notifications.notestack.app/v1/workspaces/${this.routeId}/channels/${channelId}/finalize`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          resourceId,
          expiresAt: Date.now() + 60_000,
        }),
      }
    )
  }

  public sendWebhook(
    channel: PreparedChannel,
    resourceId: string,
    messageNumber: string,
    verificationToken = channel.verificationToken
  ): Promise<Response> {
    return exports.default.fetch(channel.webhookUrl, {
      method: 'POST',
      headers: {
        'x-goog-channel-id': channel.channelId,
        'x-goog-resource-id': resourceId,
        'x-goog-resource-state': 'change',
        'x-goog-channel-token': verificationToken,
        'x-goog-message-number': messageNumber,
      },
    })
  }
}
