import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CredentialBrokerClient } from '../../../../../src/modules/sync/credential-broker/credential-broker.client'
import { GoogleNotificationCoordinator } from '../../../../../src/modules/sync/google-drive/notification/google-notification.coordinator'
import type { GoogleNotificationRepository } from '../../../../../src/modules/sync/google-drive/notification/google-notification.repository'
import type { GoogleRelayClient } from '../../../../../src/modules/sync/google-drive/notification/google-relay.client'
import type { GoogleWatchService } from '../../../../../src/modules/sync/google-drive/notification/google-watch.service'
import type { GoogleNotificationContext } from '../../../../../src/modules/sync/google-drive/notification/types/google-notification-context'
import type { SyncOrchestrationService } from '../../../../../src/modules/sync/sync-orchestration.service'
import { SyncTriggerEnum } from '../../../../../src/modules/sync/types/sync-trigger-enum'

const baseContext: GoogleNotificationContext = {
  workspaceId: '11111111-1111-4111-8111-111111111111',
  deviceId: '22222222-2222-4222-8222-222222222222',
  cursor: 'cursor-1',
  routing: {
    workspaceRouteId: 'AAAAAAAAAAAAAAAAAAAAAA',
    notificationAuthKey: Buffer.alloc(32, 1).toString('base64url'),
    secretVersion: 1,
  },
  metadata: null,
}

let context: GoogleNotificationContext | null
let repository: GoogleNotificationRepository
let relayClient: GoogleRelayClient
let watchService: GoogleWatchService
let orchestrationService: SyncOrchestrationService
let closeRelay: ReturnType<typeof vi.fn>
let connect: ReturnType<typeof vi.fn>
let prepareChannel: ReturnType<typeof vi.fn>
let finalizeChannel: ReturnType<typeof vi.fn>
let acquireRenewalLease: ReturnType<typeof vi.fn>
let releaseRenewalLease: ReturnType<typeof vi.fn>
let removeChannel: ReturnType<typeof vi.fn>
let rotateVerifier: ReturnType<typeof vi.fn>
let watch: ReturnType<typeof vi.fn>
let stop: ReturnType<typeof vi.fn>
let trigger: ReturnType<typeof vi.fn>
let onWorkspaceChanged: (() => void) | null
let onDisconnected: (() => void) | null
let coordinator: GoogleNotificationCoordinator | null

const createCoordinator = (
  relayBaseUrl = 'https://relay.example'
): GoogleNotificationCoordinator =>
  new GoogleNotificationCoordinator(
    repository,
    orchestrationService,
    {} as CredentialBrokerClient,
    {
      fallbackIntervalMs: 60_000,
      observeIntervalMs: 1_000,
      reconnectMaximumMs: 60_000,
      relayBaseUrl,
      renewalWindowMs: 24 * 60 * 60_000,
      now: () => Date.now(),
      random: () => 0.5,
      createRelayClient: () => relayClient,
      createWatchService: () => watchService,
    }
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'))
  context = structuredClone(baseContext)
  onWorkspaceChanged = null
  onDisconnected = null
  closeRelay = vi.fn()
  connect = vi.fn(async (changed, disconnected) => {
    onWorkspaceChanged = changed
    onDisconnected = disconnected
  })
  prepareChannel = vi.fn(async () => ({
    channelId: 'new-channel',
    verificationToken: 'verification-token',
    webhookUrl: 'https://relay.example/webhook',
    preparationExpiresAt: Date.now() + 600_000,
  }))
  finalizeChannel = vi.fn(async () => undefined)
  acquireRenewalLease = vi.fn(async () => ({
    leaseId: 'lease-id',
    deviceId: baseContext.deviceId,
    expiresAt: Date.now() + 120_000,
    owned: true,
    renewalRequired: true,
    activeChannelExpiresAt: null,
  }))
  releaseRenewalLease = vi.fn(async () => undefined)
  removeChannel = vi.fn(async () => undefined)
  rotateVerifier = vi.fn(async () => undefined)
  relayClient = {
    acquireRenewalLease,
    close: closeRelay,
    connect,
    finalizeChannel,
    prepareChannel,
    releaseRenewalLease,
    removeChannel,
    rotateVerifier,
  } as unknown as GoogleRelayClient
  watch = vi.fn(async () => ({
    channelId: 'new-channel',
    resourceId: 'new-resource',
    expiresAt: Date.now() + 6 * 24 * 60 * 60_000,
  }))
  stop = vi.fn(async () => undefined)
  watchService = { stop, watch } as unknown as GoogleWatchService
  repository = {
    getContext: vi.fn(() => context),
    saveDegradedState: vi.fn(),
    saveExpiredState: vi.fn(),
    saveHealthyState: vi.fn((metadata) => {
      if (context) {
        context = { ...context, metadata }
      }
    }),
  } as unknown as GoogleNotificationRepository
  trigger = vi.fn(async () => ({}))
  orchestrationService = {
    trigger,
  } as unknown as SyncOrchestrationService
  coordinator = null
})

afterEach(async () => {
  await coordinator?.onModuleDestroy()
  vi.useRealTimers()
})

describe(GoogleNotificationCoordinator.name, () => {
  it('does no relay, credential, or watch work without an enabled routed context', async () => {
    context = null
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(connect).not.toHaveBeenCalled()
    expect(watch).not.toHaveBeenCalled()
    expect(trigger).not.toHaveBeenCalled()
  })

  it('reconciles on relay connection before creating and finalizing a watch', async () => {
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)

    expect(connect).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveBeenCalledWith(SyncTriggerEnum.ProviderSignal)
    expect(watch).toHaveBeenCalledWith('cursor-1', expect.any(Object))
    expect(finalizeChannel).toHaveBeenCalledWith(
      'new-channel',
      'new-resource',
      expect.any(Number)
    )
    expect(trigger.mock.invocationCallOrder[0]).toBeLessThan(
      watch.mock.invocationCallOrder[0]
    )
    expect(finalizeChannel.mock.invocationCallOrder[0]).toBeLessThan(
      (repository.saveHealthyState as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0]
    )
    expect(releaseRenewalLease).toHaveBeenCalledWith('lease-id')
  })

  it('finalizes a replacement before retiring the previous overlapping channel', async () => {
    context = {
      ...structuredClone(baseContext),
      metadata: {
        channelId: 'old-channel',
        resourceId: 'old-resource',
        expiresAt: Date.now() + 60_000,
        relayChannelExpiresAt: Date.now() + 60_000,
        relayConnectedAt: null,
      },
    }
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)

    expect(finalizeChannel.mock.invocationCallOrder[0]).toBeLessThan(
      stop.mock.invocationCallOrder[0]
    )
    expect(stop).toHaveBeenCalledWith('old-channel', 'old-resource')
    expect(removeChannel).toHaveBeenCalledWith('old-channel')
  })

  it('does not create a Google watch when another connected device owns renewal', async () => {
    acquireRenewalLease.mockResolvedValue({
      leaseId: 'other-lease',
      deviceId: '33333333-3333-4333-8333-333333333333',
      expiresAt: Date.now() + 120_000,
      owned: false,
      renewalRequired: true,
      activeChannelExpiresAt: null,
    })
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)

    expect(watch).not.toHaveBeenCalled()
    expect(repository.saveDegradedState).toHaveBeenCalled()
  })

  it('uses a healthy relay channel renewed by another device without creating another watch', async () => {
    acquireRenewalLease.mockResolvedValue({
      leaseId: null,
      deviceId: null,
      expiresAt: null,
      owned: false,
      renewalRequired: false,
      activeChannelExpiresAt: Date.now() + 6 * 24 * 60 * 60_000,
    })
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)

    expect(watch).not.toHaveBeenCalled()
    expect(repository.saveHealthyState).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: null,
        resourceId: null,
        relayChannelExpiresAt: Date.now() + 6 * 24 * 60 * 60_000,
      })
    )
  })

  it('preserves the previous channel when relay finalization fails', async () => {
    const previousMetadata = {
      channelId: 'old-channel',
      resourceId: 'old-resource',
      expiresAt: Date.now() + 60_000,
      relayChannelExpiresAt: Date.now() + 60_000,
      relayConnectedAt: null,
    }
    context = { ...structuredClone(baseContext), metadata: previousMetadata }
    finalizeChannel.mockRejectedValue(new Error('relay unavailable'))
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)

    expect(watch).toHaveBeenCalledTimes(1)
    expect(repository.saveHealthyState).not.toHaveBeenCalled()
    expect(repository.saveDegradedState).toHaveBeenCalledWith(previousMetadata)
    expect(stop).toHaveBeenCalledWith('new-channel', 'new-resource')
    expect(removeChannel).toHaveBeenCalledWith('new-channel')
    expect(stop).not.toHaveBeenCalledWith('old-channel', 'old-resource')
    expect(releaseRenewalLease).toHaveBeenCalledWith('lease-id')
  })
  it('coalesces relay wake-ups through the orchestration provider trigger', async () => {
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)
    trigger.mockClear()

    onWorkspaceChanged?.()
    onWorkspaceChanged?.()
    onWorkspaceChanged?.()

    expect(trigger).toHaveBeenCalledTimes(3)
    expect(trigger).toHaveBeenCalledWith(SyncTriggerEnum.ProviderSignal)
  })

  it('falls back to minute polling while the relay is unavailable', async () => {
    connect.mockRejectedValue(new Error('relay unavailable'))
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(59_999)

    expect(trigger).not.toHaveBeenCalled()
    expect(repository.saveDegradedState).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(trigger).toHaveBeenCalledWith(SyncTriggerEnum.ProviderSignal)
    expect(watch).not.toHaveBeenCalled()
  })

  it('backs off degraded polling after an offline synchronization result', async () => {
    connect.mockRejectedValue(new Error('relay unavailable'))
    trigger.mockResolvedValue({ state: 'offline' })
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(trigger).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(119_999)
    expect(trigger).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(trigger).toHaveBeenCalledTimes(2)
  })
  it('uses fallback polling without relay traffic when deployment is unconfigured', async () => {
    coordinator = createCoordinator('')

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(connect).not.toHaveBeenCalled()
    expect(watch).not.toHaveBeenCalled()
    expect(trigger).toHaveBeenCalledWith(SyncTriggerEnum.ProviderSignal)
  })

  it('rotates the relay verifier before reconnecting with the next secret version', async () => {
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)
    context = {
      ...context!,
      routing: {
        ...context!.routing,
        notificationAuthKey: Buffer.alloc(32, 2).toString('base64url'),
        secretVersion: 2,
      },
    }

    await vi.advanceTimersByTimeAsync(1_000)

    expect(rotateVerifier).toHaveBeenCalledWith(
      context.routing,
      Date.now() + 23 * 60 * 60_000
    )
    expect(rotateVerifier.mock.invocationCallOrder[0]).toBeLessThan(
      connect.mock.invocationCallOrder[1]
    )
  })
  it('retains the old relay runtime until a transient verifier rotation succeeds', async () => {
    rotateVerifier.mockRejectedValueOnce(new Error('relay unavailable'))
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)
    context = {
      ...context!,
      routing: {
        ...context!.routing,
        notificationAuthKey: Buffer.alloc(32, 2).toString('base64url'),
        secretVersion: 2,
      },
    }

    await vi.advanceTimersByTimeAsync(1_000)

    expect(rotateVerifier).toHaveBeenCalledTimes(1)
    expect(connect).toHaveBeenCalledTimes(1)
    expect(closeRelay).not.toHaveBeenCalled()
    expect(repository.saveDegradedState).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_000)

    expect(rotateVerifier).toHaveBeenCalledTimes(2)
    expect(connect).toHaveBeenCalledTimes(2)
    expect(closeRelay).toHaveBeenCalledTimes(1)
  })
  it('marks a disconnected relay degraded and reconciles again after reconnect', async () => {
    coordinator = createCoordinator()

    coordinator.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)
    trigger.mockClear()

    onDisconnected?.()
    await vi.advanceTimersByTimeAsync(5_000)

    expect(repository.saveDegradedState).toHaveBeenCalled()
    expect(connect).toHaveBeenCalledTimes(2)
    expect(trigger).toHaveBeenCalledWith(SyncTriggerEnum.ProviderSignal)
  })
})
