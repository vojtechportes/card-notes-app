import { VERIFIER_BYTE_LENGTH } from '../constants/relay.constants'

const encoder = new TextEncoder()

export class RelayCryptoService {
  public createRandomToken(byteLength = 32): string {
    const bytes = new Uint8Array(byteLength)

    crypto.getRandomValues(bytes)

    return this.encodeBase64Url(bytes)
  }

  public isBase64UrlByteLength(
    value: unknown,
    byteLength: number
  ): value is string {
    if (typeof value !== 'string') {
      return false
    }

    if (!/^[A-Za-z0-9_-]+$/.test(value) || value.includes('=')) {
      return false
    }

    try {
      return this.decodeBase64Url(value).byteLength === byteLength
    } catch {
      return false
    }
  }

  public isVerifier(value: unknown): value is string {
    return this.isBase64UrlByteLength(value, VERIFIER_BYTE_LENGTH)
  }

  public async deriveWorkspaceVerifier(
    notificationAuthKey: string,
    workspaceRouteId: string
  ): Promise<string> {
    if (!this.isVerifier(notificationAuthKey)) {
      throw new TypeError(
        'The notification authentication key must contain exactly 32 bytes'
      )
    }

    const key = await crypto.subtle.importKey(
      'raw',
      this.decodeBase64Url(notificationAuthKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`notestack-relay-verifier-v1\u0000${workspaceRouteId}`)
    )

    return this.encodeBase64Url(new Uint8Array(signature))
  }

  public async hashOpaqueValue(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))

    return this.encodeBase64Url(new Uint8Array(digest))
  }

  public async createChallengeProof(
    verifierHash: string,
    proofPayload: string
  ): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      this.decodeBase64Url(verifierHash),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(proofPayload)
    )

    return this.encodeBase64Url(new Uint8Array(signature))
  }

  public async verifyChallengeProof(
    verifierHash: string,
    proofPayload: string,
    suppliedProof: unknown
  ): Promise<boolean> {
    if (!this.isBase64UrlByteLength(suppliedProof, 32)) {
      return false
    }

    const expected = await this.createChallengeProof(verifierHash, proofPayload)
    const expectedBytes = this.decodeBase64Url(expected)
    const suppliedBytes = this.decodeBase64Url(suppliedProof)
    let difference = 0

    for (let index = 0; index < expectedBytes.length; index += 1) {
      difference |= expectedBytes[index] ^ suppliedBytes[index]
    }

    return difference === 0
  }

  public decodeBase64Url(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const paddingLength = (4 - (base64.length % 4)) % 4
    const binary = atob(`${base64}${'='.repeat(paddingLength)}`)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return bytes
  }

  public encodeBase64Url(bytes: Uint8Array): string {
    let binary = ''

    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }
}
