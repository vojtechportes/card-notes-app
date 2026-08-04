import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common'
import { createBrokeredAccessTokenProvider } from '../../credential-broker/create-brokered-access-token-provider'
import { CredentialBrokerClient } from '../../credential-broker/credential-broker.client'
import { SyncOrchestrationService } from '../../sync-orchestration.service'
import type { NotificationRouting } from '../../types/notification-routing'
import { SyncProviderEnum } from '../../types/sync-provider-enum'
import { SyncStatusStateEnum } from '../../types/sync-status-state-enum'
import { SyncTriggerEnum } from '../../types/sync-trigger-enum'
import { GoogleNotificationRepository } from './google-notification.repository'
import { GoogleRelayClient } from './google-relay.client'
import { GoogleWatchService } from './google-watch.service'
import type { GoogleNotificationContext } from './types/google-notification-context'
import type { GoogleNotificationCoordinatorOptions } from './types/google-notification-coordinator-options'
import type { GoogleNotificationMetadata } from './types/google-notification-metadata'

const DEFAULT_FALLBACK_INTERVAL_MS = 60_000
const DEFAULT_OBSERVE_INTERVAL_MS = 1_000
const DEFAULT_RECONNECT_MAXIMUM_MS = 60_000
const DEFAULT_RENEWAL_WINDOW_MS = 24 * 60 * 60_000
const INITIAL_RECONNECT_DELAY_MS = 5_000

@Injectable()
export class GoogleNotificationCoordinator
  implements OnModuleInit, OnModuleDestroy
{
  private readonly fallbackIntervalMs: number
  private readonly observeIntervalMs: number
  private readonly reconnectMaximumMs: number
  private readonly relayBaseUrl: string
  private readonly renewalWindowMs: number
  private readonly now: () => number
  private readonly random: () => number
  private readonly createRelayClient: (
    context: GoogleNotificationContext
  ) => GoogleRelayClient
  private readonly createWatchService: () => GoogleWatchService
  private relayClient: GoogleRelayClient | null = null
  private watchService: GoogleWatchService | null = null
  private runtimeSignature: string | null = null
  private runtimeRouting: NotificationRouting | null = null
  private runtimeGeneration = 0
  private activeLeaseId: string | null = null
  private connectPromise: Promise<void> | null = null
  private channelPromise: Promise<void> | null = null
  private observeTimer: ReturnType<typeof setInterval> | null = null
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null
  private fallbackActive = false
  private fallbackAttempt = 0
  private connected = false
  private destroyed = false
  private reconnectAttempt = 0
  private nextReconnectAt = 0

  constructor(
    @Inject(GoogleNotificationRepository)
    private readonly repository: GoogleNotificationRepository,
    @Inject(SyncOrchestrationService)
    private readonly orchestrationService: SyncOrchestrationService,
    @Inject(CredentialBrokerClient)
    private readonly credentialBrokerClient: CredentialBrokerClient,
    @Optional() options: GoogleNotificationCoordinatorOptions = {}
  ) {
    this.fallbackIntervalMs =
      options.fallbackIntervalMs ?? DEFAULT_FALLBACK_INTERVAL_MS
    this.observeIntervalMs =
      options.observeIntervalMs ?? DEFAULT_OBSERVE_INTERVAL_MS
    this.reconnectMaximumMs =
      options.reconnectMaximumMs ?? DEFAULT_RECONNECT_MAXIMUM_MS
    this.relayBaseUrl =
      options.relayBaseUrl ?? process.env.NOTESTACK_NOTIFICATION_RELAY_URL ?? ''
    this.renewalWindowMs = options.renewalWindowMs ?? DEFAULT_RENEWAL_WINDOW_MS
    this.now = options.now ?? Date.now
    this.random = options.random ?? Math.random
    this.createRelayClient =
      options.createRelayClient ??
      ((context) =>
        new GoogleRelayClient(
          this.relayBaseUrl,
          context.routing,
          context.deviceId
        ))
    this.createWatchService =
      options.createWatchService ??
      (() =>
        new GoogleWatchService(
          createBrokeredAccessTokenProvider(
            this.credentialBrokerClient,
            SyncProviderEnum.GoogleDrive
          )
        ))
  }

  onModuleInit(): void {
    this.observeTimer = setInterval(() => {
      void this.observe()
    }, this.observeIntervalMs)
    this.observeTimer.unref?.()

    queueMicrotask(() => {
      void this.observe()
    })
  }

  async onModuleDestroy(): Promise<void> {
    this.destroyed = true

    if (this.observeTimer) {
      clearInterval(this.observeTimer)
      this.observeTimer = null
    }

    this.stopFallback()
    await this.releaseLease()
    this.stopRuntime()
  }

  private async observe(): Promise<void> {
    if (this.destroyed) {
      return
    }

    const context = this.repository.getContext()

    if (!context) {
      this.stopFallback()
      await this.releaseLease()
      this.stopRuntime()
      return
    }

    if (!this.relayBaseUrl) {
      this.repository.saveDegradedState(context.metadata)
      this.startFallback()
      return
    }

    const signature = this.getRuntimeSignature(context)

    if (signature !== this.runtimeSignature) {
      const canSwitchRouting = await this.rotateRoutingIfNeeded(context.routing)

      if (!canSwitchRouting) {
        this.repository.saveDegradedState(context.metadata)
        this.startFallback()
        return
      }

      await this.releaseLease()
      this.stopRuntime()
      this.runtimeSignature = signature
      this.runtimeRouting = { ...context.routing }
      this.relayClient = this.createRelayClient(context)
      this.watchService = this.createWatchService()
    }

    if (!this.connected) {
      this.startFallback()

      if (this.now() >= this.nextReconnectAt) {
        await this.connect(context)
      }

      return
    }

    await this.ensureChannel(context)
  }

  private async connect(context: GoogleNotificationContext): Promise<void> {
    if (!this.relayClient || this.connectPromise) {
      return this.connectPromise ?? Promise.resolve()
    }

    const client = this.relayClient
    const generation = this.runtimeGeneration
    const promise = this.performConnect(client, context, generation).catch(
      () => {
        if (!this.isRuntimeActive(generation)) {
          return
        }

        this.repository.saveDegradedState(context.metadata)
        this.scheduleReconnect()
        this.startFallback()
      }
    )

    this.connectPromise = promise

    try {
      await promise
    } finally {
      if (this.connectPromise === promise) {
        this.connectPromise = null
      }
    }
  }

  private async performConnect(
    client: GoogleRelayClient,
    context: GoogleNotificationContext,
    generation: number
  ): Promise<void> {
    await client.connect(
      () => {
        if (this.isRuntimeActive(generation)) {
          void this.orchestrationService.trigger(SyncTriggerEnum.ProviderSignal)
        }
      },
      () => this.handleDisconnect(generation)
    )

    if (!this.isRuntimeActive(generation)) {
      client.close()
      return
    }

    this.connected = true
    this.reconnectAttempt = 0
    this.nextReconnectAt = 0
    await this.orchestrationService.trigger(SyncTriggerEnum.ProviderSignal)

    if (!this.isRuntimeActive(generation)) {
      return
    }

    const currentContext = this.repository.getContext()

    if (currentContext) {
      await this.ensureChannel(currentContext)
    }
  }
  private async ensureChannel(
    context: GoogleNotificationContext
  ): Promise<void> {
    if (this.channelPromise) {
      return this.channelPromise
    }

    const metadata = context.metadata

    if (
      metadata &&
      metadata.relayChannelExpiresAt > this.now() + this.renewalWindowMs
    ) {
      this.repository.saveHealthyState({
        ...metadata,
        relayConnectedAt: new Date(this.now()).toISOString(),
      })
      this.stopFallback()
      return
    }

    if (metadata && metadata.relayChannelExpiresAt <= this.now()) {
      this.repository.saveExpiredState(metadata)
    }

    const generation = this.runtimeGeneration

    this.channelPromise = this.replaceChannel(context, generation)
      .catch(() => {
        if (this.isRuntimeActive(generation)) {
          this.repository.saveDegradedState(metadata)
          this.startFallback()
        }
      })
      .finally(() => {
        this.channelPromise = null
      })

    return this.channelPromise
  }

  private async replaceChannel(
    initialContext: GoogleNotificationContext,
    generation: number
  ): Promise<void> {
    const client = this.relayClient
    const watchService = this.watchService

    if (!client || !watchService || !this.connected) {
      return
    }

    const lease = await client.acquireRenewalLease()

    if (!this.isRuntimeActive(generation)) {
      if (lease.owned && lease.leaseId !== null) {
        try {
          await client.releaseRenewalLease(lease.leaseId)
        } catch {
          // Relay lease expiry guarantees eventual ownership recovery.
        }
      }

      return
    }

    if (!lease.renewalRequired) {
      if (lease.activeChannelExpiresAt === null) {
        throw new Error('The relay returned invalid channel health metadata.')
      }

      this.repository.saveHealthyState({
        channelId: initialContext.metadata?.channelId ?? null,
        resourceId: initialContext.metadata?.resourceId ?? null,
        expiresAt:
          initialContext.metadata?.expiresAt ?? lease.activeChannelExpiresAt,
        relayChannelExpiresAt: lease.activeChannelExpiresAt,
        relayConnectedAt: new Date(this.now()).toISOString(),
      })
      this.stopFallback()
      return
    }

    if (!lease.owned || lease.leaseId === null) {
      this.repository.saveDegradedState(initialContext.metadata)
      this.startFallback()
      return
    }

    this.activeLeaseId = lease.leaseId

    try {
      const preparedChannel = await client.prepareChannel()

      if (!this.isRuntimeActive(generation)) {
        return
      }
      const currentContext = this.repository.getContext()

      if (!currentContext) {
        return
      }

      const channel = await watchService.watch(
        currentContext.cursor,
        preparedChannel
      )
      if (!this.isRuntimeActive(generation)) {
        return
      }

      try {
        await client.finalizeChannel(
          channel.channelId,
          channel.resourceId,
          channel.expiresAt
        )
      } catch (error) {
        await this.discardUnfinalizedChannel(client, watchService, channel)
        throw error
      }

      if (!this.isRuntimeActive(generation)) {
        return
      }

      const newMetadata: GoogleNotificationMetadata = {
        channelId: channel.channelId,
        resourceId: channel.resourceId,
        expiresAt: channel.expiresAt,
        relayChannelExpiresAt: channel.expiresAt,
        relayConnectedAt: new Date(this.now()).toISOString(),
      }
      const previousMetadata = currentContext.metadata

      this.repository.saveHealthyState(newMetadata)
      this.stopFallback()

      if (
        previousMetadata?.channelId &&
        previousMetadata.resourceId &&
        previousMetadata.channelId !== newMetadata.channelId
      ) {
        await this.retirePreviousChannel(previousMetadata)
      }
    } finally {
      await this.releaseLease()
    }
  }

  private async discardUnfinalizedChannel(
    client: GoogleRelayClient,
    watchService: GoogleWatchService,
    channel: {
      channelId: string
      resourceId: string
    }
  ): Promise<void> {
    try {
      await watchService.stop(channel.channelId, channel.resourceId)
    } catch {
      // Google channels expire and cannot affect the authoritative change cursor.
    }

    try {
      await client.removeChannel(channel.channelId)
    } catch {
      // Prepared relay channels expire automatically.
    }
  }
  private async retirePreviousChannel(
    metadata: GoogleNotificationMetadata
  ): Promise<void> {
    if (
      !this.relayClient ||
      !this.watchService ||
      !metadata.channelId ||
      !metadata.resourceId
    ) {
      return
    }

    try {
      await this.watchService.stop(metadata.channelId, metadata.resourceId)
      await this.relayClient.removeChannel(metadata.channelId)
    } catch {
      // The finalized replacement remains authoritative while overlap expires.
    }
  }

  private handleDisconnect(generation: number): void {
    if (!this.isRuntimeActive(generation)) {
      return
    }

    this.connected = false
    const context = this.repository.getContext()

    if (context) {
      this.repository.saveDegradedState(context.metadata)
    }

    this.scheduleReconnect()
    this.startFallback()
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      this.reconnectMaximumMs,
      INITIAL_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt
    )

    this.reconnectAttempt += 1
    this.nextReconnectAt = this.now() + delay
  }

  private startFallback(): void {
    if (this.fallbackActive) {
      return
    }

    this.fallbackActive = true
    this.scheduleFallback()
  }

  private scheduleFallback(): void {
    if (!this.fallbackActive || this.fallbackTimer) {
      return
    }

    const backoffMultiplier = 2 ** Math.min(this.fallbackAttempt, 2)
    const jitterMultiplier = 0.8 + this.random() * 0.4
    const delay = Math.round(
      this.fallbackIntervalMs * backoffMultiplier * jitterMultiplier
    )

    this.fallbackTimer = setTimeout(() => {
      this.fallbackTimer = null
      void this.runFallback()
    }, delay)
    this.fallbackTimer.unref?.()
  }

  private async runFallback(): Promise<void> {
    if (!this.fallbackActive) {
      return
    }

    const status = await this.orchestrationService.trigger(
      SyncTriggerEnum.ProviderSignal
    )

    if (
      status.state === SyncStatusStateEnum.Offline ||
      status.state === SyncStatusStateEnum.Error
    ) {
      this.fallbackAttempt += 1
    } else {
      this.fallbackAttempt = 0
    }

    this.scheduleFallback()
  }

  private stopFallback(): void {
    this.fallbackActive = false
    this.fallbackAttempt = 0

    if (!this.fallbackTimer) {
      return
    }

    clearTimeout(this.fallbackTimer)
    this.fallbackTimer = null
  }
  private async releaseLease(): Promise<void> {
    const leaseId = this.activeLeaseId
    this.activeLeaseId = null

    if (!leaseId || !this.relayClient) {
      return
    }

    try {
      await this.relayClient.releaseRenewalLease(leaseId)
    } catch {
      // Relay lease expiry/disconnect guarantees eventual ownership recovery.
    }
  }

  private stopRuntime(): void {
    this.runtimeGeneration += 1
    this.relayClient?.close()
    this.relayClient = null
    this.watchService = null
    this.runtimeSignature = null
    this.runtimeRouting = null
    this.connected = false
    this.connectPromise = null
    this.channelPromise = null
    this.reconnectAttempt = 0
    this.nextReconnectAt = 0
  }

  private async rotateRoutingIfNeeded(
    nextRouting: NotificationRouting
  ): Promise<boolean> {
    const currentRouting = this.runtimeRouting
    const client = this.relayClient

    if (
      !client ||
      !currentRouting ||
      currentRouting.workspaceRouteId !== nextRouting.workspaceRouteId ||
      nextRouting.secretVersion !== currentRouting.secretVersion + 1
    ) {
      return true
    }

    try {
      await client.rotateVerifier(nextRouting, this.now() + 23 * 60 * 60_000)

      return true
    } catch {
      return false
    }
  }
  private isRuntimeActive(generation: number): boolean {
    return !this.destroyed && generation === this.runtimeGeneration
  }

  private getRuntimeSignature(context: GoogleNotificationContext): string {
    return [
      context.workspaceId,
      context.deviceId,
      context.routing.workspaceRouteId,
      context.routing.secretVersion,
    ].join(':')
  }
}
