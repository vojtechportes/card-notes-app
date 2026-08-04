import { v4 as uuidv4 } from 'uuid'
import {
  CHALLENGE_TTL_MS,
  CHANNEL_MAX_LIFETIME_MS,
  CHANNEL_RENEWAL_WINDOW_MS,
  CHANNEL_PREPARATION_TTL_MS,
  CONNECTION_TOKEN_TTL_MS,
  DEVICE_ID_PATTERN,
  MAX_ACTIVE_CHANNELS,
  NOTIFICATION_COALESCE_MS,
  RELAY_PROTOCOL_VERSION,
  RENEWAL_LEASE_TTL_MS,
  VERIFIER_ROLLOVER_MAX_MS,
  WORKSPACE_ROUTE_ID_PATTERN,
} from '../constants/relay.constants'
import type { AuthenticatedDevice } from '../types/authenticated-device'
import type { ChallengeResponse } from '../types/challenge-response'
import type { ConnectionTokenResponse } from '../types/connection-token-response'
import type { ExchangeChallengeInput } from '../types/exchange-challenge-input'
import type { FinalizeChannelInput } from '../types/finalize-channel-input'
import type { FlushNotificationResult } from '../types/flush-notification-result'
import type { GoogleWebhookInput } from '../types/google-webhook-input'
import type { PreparedChannel } from '../types/prepared-channel'
import type { RateLimitAction } from '../types/rate-limit-action'
import type { RateLimitPolicy } from '../types/rate-limit-policy'
import type { RegisterWorkspaceInput } from '../types/register-workspace-input'
import type { RelayWorkspaceSnapshot } from '../types/relay-workspace-snapshot'
import type { RenewalLeaseResult } from '../types/renewal-lease-result'
import type { RotateVerifierInput } from '../types/rotate-verifier-input'
import type { WebhookResult } from '../types/webhook-result'
import type { WorkspaceRegistrationResult } from '../types/workspace-registration-result'
import type { WorkspaceServiceOptions } from '../types/workspace-service-options'
import { RelayCryptoService } from './relay-crypto.service'
import { RelayError } from './relay-error'

const RATE_LIMIT_POLICIES: Record<RateLimitAction, RateLimitPolicy> = {
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  challenge: { limit: 30, windowMs: 60 * 1000 },
  token: { limit: 20, windowMs: 60 * 1000 },
  channel: { limit: 60, windowMs: 60 * 1000 },
  'webhook-attempt': { limit: 600, windowMs: 60 * 1000 },
  webhook: { limit: 300, windowMs: 60 * 1000 },
  lease: { limit: 60, windowMs: 60 * 1000 },
}

export class RelayWorkspaceService {
  private readonly cryptoService = new RelayCryptoService()
  private readonly now: () => number
  private snapshot: RelayWorkspaceSnapshot

  public constructor(
    private readonly workspaceRouteId: string,
    snapshot?: RelayWorkspaceSnapshot,
    options: WorkspaceServiceOptions = {}
  ) {
    if (!WORKSPACE_ROUTE_ID_PATTERN.test(workspaceRouteId)) {
      throw new RelayError(
        400,
        'invalid_workspace_route',
        'The workspace route is invalid'
      )
    }

    this.now = options.now ?? Date.now
    this.snapshot = snapshot ?? this.createEmptySnapshot()
    this.cleanupExpiredState()
  }

  public getSnapshot(): RelayWorkspaceSnapshot {
    return structuredClone(this.snapshot)
  }

  public runMaintenance(connectedDeviceIds: ReadonlySet<string>): void {
    this.cleanupExpiredState(connectedDeviceIds)
  }

  public getNextMaintenanceAt(): number | null {
    const candidates = [
      ...Object.values(this.snapshot.challenges).map(
        (value) => value.expiresAt
      ),
      ...Object.values(this.snapshot.connectionTokens).map(
        (value) => value.expiresAt
      ),
      ...Object.values(this.snapshot.channels).map((value) => value.expiresAt),
    ]
    const previousVerifierExpiry = this.snapshot.previousVerifier?.validUntil
    const leaseExpiry = this.snapshot.renewalLease?.expiresAt

    if (
      previousVerifierExpiry !== null &&
      previousVerifierExpiry !== undefined
    ) {
      candidates.push(previousVerifierExpiry)
    }

    if (leaseExpiry !== undefined) {
      candidates.push(leaseExpiry)
    }

    return candidates.length > 0 ? Math.min(...candidates) : null
  }

  public async registerWorkspace(
    input: RegisterWorkspaceInput
  ): Promise<WorkspaceRegistrationResult> {
    this.enforceRateLimit('register')
    this.assertVerifierInput(input.verifier, input.secretVersion)

    const verifierHash = await this.cryptoService.hashOpaqueValue(
      input.verifier
    )
    const currentVerifier = this.snapshot.currentVerifier

    if (currentVerifier !== null) {
      const isIdempotent =
        currentVerifier.secretVersion === input.secretVersion &&
        currentVerifier.verifierHash === verifierHash

      if (!isIdempotent) {
        throw new RelayError(
          409,
          'workspace_already_registered',
          'The workspace route is already registered'
        )
      }

      return { created: false, secretVersion: currentVerifier.secretVersion }
    }

    this.snapshot.registeredAt = this.now()
    this.snapshot.currentVerifier = {
      verifierHash,
      secretVersion: input.secretVersion,
      validUntil: null,
    }

    return { created: true, secretVersion: input.secretVersion }
  }

  public createChallenge(): ChallengeResponse {
    this.assertRegistered()
    this.enforceRateLimit('challenge')
    this.cleanupExpiredState()

    const now = this.now()
    const challengeId = uuidv4()
    const nonce = this.cryptoService.createRandomToken()
    const expiresAt = now + CHALLENGE_TTL_MS

    this.snapshot.challenges[challengeId] = {
      id: challengeId,
      nonce,
      expiresAt,
      usedAt: null,
    }

    return { challengeId, challenge: nonce, expiresAt }
  }

  public async exchangeChallenge(
    input: ExchangeChallengeInput
  ): Promise<ConnectionTokenResponse> {
    this.assertRegistered()
    this.enforceRateLimit('token')
    this.cleanupExpiredState()

    if (!DEVICE_ID_PATTERN.test(input.deviceId)) {
      throw new RelayError(
        400,
        'invalid_device_id',
        'The device identifier is invalid'
      )
    }

    const challenge = this.snapshot.challenges[input.challengeId]

    if (challenge === undefined || challenge.expiresAt <= this.now()) {
      throw new RelayError(
        401,
        'challenge_expired',
        'The challenge is missing or expired'
      )
    }

    if (challenge.usedAt !== null) {
      throw new RelayError(
        401,
        'challenge_replayed',
        'The challenge has already been used'
      )
    }

    const verifier = this.findVerifier(input.secretVersion)
    const proofPayload = this.createProofPayload(
      challenge.id,
      challenge.nonce,
      input.deviceId,
      input.secretVersion
    )
    const proofValid = await this.cryptoService.verifyChallengeProof(
      verifier.verifierHash,
      proofPayload,
      input.proof
    )

    challenge.usedAt = this.now()

    if (!proofValid) {
      throw new RelayError(
        401,
        'invalid_challenge_proof',
        'The challenge proof is invalid'
      )
    }

    const token = this.cryptoService.createRandomToken()
    const tokenHash = await this.cryptoService.hashOpaqueValue(token)
    const expiresAt = this.now() + CONNECTION_TOKEN_TTL_MS

    this.snapshot.connectionTokens[tokenHash] = {
      tokenHash,
      deviceId: input.deviceId,
      secretVersion: input.secretVersion,
      expiresAt,
      connectedAt: null,
    }

    return { token, expiresAt }
  }

  public async authorizeConnectionToken(
    token: string,
    connect = false
  ): Promise<AuthenticatedDevice> {
    this.cleanupExpiredState()

    const tokenHash = await this.cryptoService.hashOpaqueValue(token)
    const record = this.snapshot.connectionTokens[tokenHash]

    if (record === undefined || record.expiresAt <= this.now()) {
      throw new RelayError(
        401,
        'invalid_connection_token',
        'The connection token is invalid or expired'
      )
    }

    this.findVerifier(record.secretVersion)

    if (connect && record.connectedAt !== null) {
      throw new RelayError(
        401,
        'connection_token_replayed',
        'The connection token was already used'
      )
    }

    if (connect) {
      record.connectedAt = this.now()
    }

    return {
      deviceId: record.deviceId,
      secretVersion: record.secretVersion,
      tokenHash,
    }
  }

  public async rotateVerifier(
    token: string,
    input: RotateVerifierInput
  ): Promise<void> {
    await this.authorizeConnectionToken(token)
    this.enforceRateLimit('channel')
    this.assertVerifierInput(input.verifier, input.secretVersion)

    const currentVerifier = this.snapshot.currentVerifier
    const now = this.now()

    if (
      currentVerifier === null ||
      input.secretVersion !== currentVerifier.secretVersion + 1
    ) {
      throw new RelayError(
        409,
        'invalid_secret_version',
        'The secret version must increase by exactly one'
      )
    }

    if (
      input.rolloverUntil <= now ||
      input.rolloverUntil > now + VERIFIER_ROLLOVER_MAX_MS
    ) {
      throw new RelayError(
        400,
        'invalid_rollover_window',
        'The verifier rollover window is invalid'
      )
    }

    const verifierHash = await this.cryptoService.hashOpaqueValue(
      input.verifier
    )

    this.snapshot.previousVerifier = {
      ...currentVerifier,
      validUntil: input.rolloverUntil,
    }
    this.snapshot.currentVerifier = {
      verifierHash,
      secretVersion: input.secretVersion,
      validUntil: null,
    }
  }

  public async prepareChannel(
    token: string,
    publicBaseUrl: string
  ): Promise<PreparedChannel> {
    await this.authorizeConnectionToken(token)
    this.enforceRateLimit('channel')
    this.cleanupExpiredState()

    if (Object.keys(this.snapshot.channels).length >= MAX_ACTIVE_CHANNELS) {
      throw new RelayError(
        409,
        'channel_limit_reached',
        'The active channel limit has been reached'
      )
    }

    const channelId = uuidv4()
    const verificationToken = this.cryptoService.createRandomToken()
    const verificationTokenHash =
      await this.cryptoService.hashOpaqueValue(verificationToken)
    const preparationExpiresAt = this.now() + CHANNEL_PREPARATION_TTL_MS

    this.snapshot.channels[channelId] = {
      channelId,
      verificationTokenHash,
      status: 'prepared',
      resourceId: null,
      expiresAt: preparationExpiresAt,
      createdAt: this.now(),
      lastMessageNumber: null,
      lastMessageAt: null,
    }

    return {
      channelId,
      verificationToken,
      webhookUrl: `${publicBaseUrl.replace(/\/$/, '')}/v1/google/webhooks/${this.workspaceRouteId}/${channelId}`,
      preparationExpiresAt,
    }
  }

  public async finalizeChannel(
    token: string,
    channelId: string,
    input: FinalizeChannelInput
  ): Promise<void> {
    await this.authorizeConnectionToken(token)
    this.enforceRateLimit('channel')
    this.cleanupExpiredState()

    const channel = this.snapshot.channels[channelId]
    const now = this.now()

    if (channel === undefined) {
      throw new RelayError(
        404,
        'channel_not_found',
        'The channel was not found'
      )
    }

    if (
      typeof input.resourceId !== 'string' ||
      input.resourceId.length < 1 ||
      input.resourceId.length > 512
    ) {
      throw new RelayError(
        400,
        'invalid_resource_id',
        'The resource identifier is invalid'
      )
    }

    if (
      input.expiresAt <= now ||
      input.expiresAt > now + CHANNEL_MAX_LIFETIME_MS
    ) {
      throw new RelayError(
        400,
        'invalid_channel_expiration',
        'The channel expiration is invalid'
      )
    }

    if (channel.status === 'active') {
      const isIdempotent =
        channel.resourceId === input.resourceId &&
        channel.expiresAt === input.expiresAt

      if (!isIdempotent) {
        throw new RelayError(
          409,
          'channel_already_finalized',
          'The channel is already finalized'
        )
      }

      return
    }

    channel.status = 'active'
    channel.resourceId = input.resourceId
    channel.expiresAt = input.expiresAt
  }

  public async removeChannel(token: string, channelId: string): Promise<void> {
    await this.authorizeConnectionToken(token)
    this.enforceRateLimit('channel')

    delete this.snapshot.channels[channelId]
  }

  public async handleGoogleWebhook(
    input: GoogleWebhookInput
  ): Promise<WebhookResult> {
    this.enforceRateLimit('webhook-attempt')
    this.cleanupExpiredState()

    const channel = this.snapshot.channels[input.channelId]

    if (channel === undefined || channel.status !== 'active') {
      throw new RelayError(
        404,
        'channel_not_found',
        'The channel was not found'
      )
    }

    if (channel.resourceId !== input.resourceId) {
      throw new RelayError(
        401,
        'resource_mismatch',
        'The webhook resource does not match the channel'
      )
    }

    const tokenHash = await this.cryptoService.hashOpaqueValue(
      input.verificationToken
    )

    if (tokenHash !== channel.verificationTokenHash) {
      throw new RelayError(
        401,
        'verification_token_mismatch',
        'The webhook token is invalid'
      )
    }

    if (input.resourceState !== 'sync' && input.resourceState !== 'change') {
      throw new RelayError(
        400,
        'invalid_resource_state',
        'The webhook resource state is invalid'
      )
    }

    if (!/^\d{1,40}$/.test(input.messageNumber)) {
      throw new RelayError(
        400,
        'invalid_message_number',
        'The webhook message number is invalid'
      )
    }

    if (
      channel.lastMessageNumber !== null &&
      BigInt(input.messageNumber) <= BigInt(channel.lastMessageNumber)
    ) {
      return {
        accepted: true,
        duplicate: true,
        coalesceAt: this.snapshot.pendingNotificationAt,
      }
    }

    try {
      this.enforceRateLimit('webhook')
    } catch (error) {
      if (error instanceof RelayError && error.code === 'rate_limited') {
        return {
          accepted: false,
          duplicate: false,
          coalesceAt: this.snapshot.pendingNotificationAt,
        }
      }

      throw error
    }

    const now = this.now()

    channel.lastMessageNumber = input.messageNumber
    channel.lastMessageAt = now
    this.snapshot.lastNotificationAt = now

    if (this.snapshot.pendingNotificationAt === null) {
      this.snapshot.pendingNotificationAt = now + NOTIFICATION_COALESCE_MS
    }

    return {
      accepted: true,
      duplicate: false,
      coalesceAt: this.snapshot.pendingNotificationAt,
    }
  }

  public flushNotification(): FlushNotificationResult {
    const pendingNotificationAt = this.snapshot.pendingNotificationAt

    if (pendingNotificationAt === null) {
      return { signal: false, nextAlarmAt: null }
    }

    if (pendingNotificationAt > this.now()) {
      return { signal: false, nextAlarmAt: pendingNotificationAt }
    }

    this.snapshot.pendingNotificationAt = null

    return { signal: true, nextAlarmAt: null }
  }

  public async acquireRenewalLease(
    token: string,
    connectedDeviceIds: ReadonlySet<string>
  ): Promise<RenewalLeaseResult> {
    const device = await this.authorizeConnectionToken(token)

    this.enforceRateLimit('lease')
    this.cleanupExpiredState(connectedDeviceIds)

    const existingLease = this.snapshot.renewalLease
    const activeChannelExpiresAt = this.getActiveChannelExpiresAt()

    if (existingLease !== null) {
      return {
        ...existingLease,
        owned: existingLease.deviceId === device.deviceId,
        renewalRequired: true,
        activeChannelExpiresAt,
      }
    }

    if (
      activeChannelExpiresAt !== null &&
      activeChannelExpiresAt > this.now() + CHANNEL_RENEWAL_WINDOW_MS
    ) {
      return {
        leaseId: null,
        deviceId: null,
        expiresAt: null,
        owned: false,
        renewalRequired: false,
        activeChannelExpiresAt,
      }
    }
    if (!connectedDeviceIds.has(device.deviceId)) {
      throw new RelayError(
        409,
        'device_not_connected',
        'The lease owner must have an active connection'
      )
    }

    const lease = {
      leaseId: uuidv4(),
      deviceId: device.deviceId,
      expiresAt: this.now() + RENEWAL_LEASE_TTL_MS,
    }

    this.snapshot.renewalLease = lease

    return {
      ...lease,
      owned: true,
      renewalRequired: true,
      activeChannelExpiresAt,
    }
  }

  public async releaseRenewalLease(
    token: string,
    leaseId: string
  ): Promise<void> {
    const device = await this.authorizeConnectionToken(token)

    this.enforceRateLimit('lease')

    const lease = this.snapshot.renewalLease

    if (lease === null) {
      return
    }

    if (lease.leaseId !== leaseId || lease.deviceId !== device.deviceId) {
      throw new RelayError(
        409,
        'lease_owner_mismatch',
        'Only the lease owner can release the lease'
      )
    }

    this.snapshot.renewalLease = null
  }

  public handleDeviceDisconnect(deviceId: string): void {
    if (this.snapshot.renewalLease?.deviceId === deviceId) {
      this.snapshot.renewalLease = null
    }
  }

  public isSecretVersionAccepted(secretVersion: number): boolean {
    try {
      this.findVerifier(secretVersion)
      return true
    } catch {
      return false
    }
  }

  public createProofPayload(
    challengeId: string,
    challenge: string,
    deviceId: string,
    secretVersion: number
  ): string {
    return [
      'notestack-relay-challenge-v1',
      this.workspaceRouteId,
      challengeId,
      challenge,
      deviceId,
      String(secretVersion),
    ].join(':')
  }

  private createEmptySnapshot(): RelayWorkspaceSnapshot {
    return {
      protocolVersion: RELAY_PROTOCOL_VERSION,
      registeredAt: null,
      currentVerifier: null,
      previousVerifier: null,
      challenges: {},
      connectionTokens: {},
      channels: {},
      renewalLease: null,
      rateLimits: {},
      pendingNotificationAt: null,
      lastNotificationAt: null,
    }
  }

  private getActiveChannelExpiresAt(): number | null {
    const expirations = Object.values(this.snapshot.channels)
      .filter((channel) => channel.status === 'active')
      .map((channel) => channel.expiresAt)

    return expirations.length > 0 ? Math.max(...expirations) : null
  }
  private assertRegistered(): void {
    if (this.snapshot.currentVerifier === null) {
      throw new RelayError(
        404,
        'workspace_not_registered',
        'The workspace route is not registered'
      )
    }
  }

  private assertVerifierInput(verifier: string, secretVersion: number): void {
    if (!this.cryptoService.isVerifier(verifier)) {
      throw new RelayError(
        400,
        'invalid_verifier',
        'The workspace verifier must contain 32 bytes'
      )
    }

    if (!Number.isSafeInteger(secretVersion) || secretVersion < 1) {
      throw new RelayError(
        400,
        'invalid_secret_version',
        'The secret version is invalid'
      )
    }
  }

  private findVerifier(secretVersion: number) {
    const currentVerifier = this.snapshot.currentVerifier

    if (currentVerifier?.secretVersion === secretVersion) {
      return currentVerifier
    }

    const previousVerifier = this.snapshot.previousVerifier

    if (
      previousVerifier?.secretVersion === secretVersion &&
      previousVerifier.validUntil !== null &&
      previousVerifier.validUntil > this.now()
    ) {
      return previousVerifier
    }

    throw new RelayError(
      401,
      'unknown_secret_version',
      'The secret version is not accepted'
    )
  }

  private cleanupExpiredState(connectedDeviceIds?: ReadonlySet<string>): void {
    const now = this.now()

    for (const [challengeId, challenge] of Object.entries(
      this.snapshot.challenges
    )) {
      if (challenge.expiresAt <= now) {
        delete this.snapshot.challenges[challengeId]
      }
    }

    for (const [tokenHash, token] of Object.entries(
      this.snapshot.connectionTokens
    )) {
      if (token.expiresAt <= now) {
        delete this.snapshot.connectionTokens[tokenHash]
      }
    }

    for (const [channelId, channel] of Object.entries(this.snapshot.channels)) {
      if (channel.expiresAt <= now) {
        delete this.snapshot.channels[channelId]
      }
    }

    const previousVerifier = this.snapshot.previousVerifier

    if (
      previousVerifier !== null &&
      previousVerifier.validUntil !== null &&
      previousVerifier.validUntil <= now
    ) {
      this.snapshot.previousVerifier = null
    }

    const lease = this.snapshot.renewalLease
    const ownerDisconnected =
      connectedDeviceIds !== undefined &&
      lease !== null &&
      !connectedDeviceIds.has(lease.deviceId)

    if (lease !== null && (lease.expiresAt <= now || ownerDisconnected)) {
      this.snapshot.renewalLease = null
    }
  }

  private enforceRateLimit(action: RateLimitAction): void {
    const now = this.now()
    const policy = RATE_LIMIT_POLICIES[action]
    const currentWindow = this.snapshot.rateLimits[action]

    if (currentWindow === undefined || currentWindow.resetAt <= now) {
      this.snapshot.rateLimits[action] = {
        count: 1,
        resetAt: now + policy.windowMs,
      }

      return
    }

    currentWindow.count += 1

    if (currentWindow.count > policy.limit) {
      throw new RelayError(
        429,
        'rate_limited',
        'The workspace rate limit was exceeded'
      )
    }
  }
}
