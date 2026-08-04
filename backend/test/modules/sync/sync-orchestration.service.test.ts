import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { SyncOrchestrationRepository } from '../../../src/modules/sync/sync-orchestration.repository'
import { SyncOrchestrationService } from '../../../src/modules/sync/sync-orchestration.service'
import type { SyncProviderAdapter } from '../../../src/modules/sync/types/sync-provider-adapter'
import { SyncProviderError } from '../../../src/modules/sync/types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../../src/modules/sync/types/sync-provider-error-kind-enum'
import type { SyncProviderFactoryContract } from '../../../src/modules/sync/types/sync-provider-factory-contract'
import { SyncProviderUnavailableError } from '../../../src/modules/sync/types/sync-provider-unavailable-error'
import { SyncStatusStateEnum } from '../../../src/modules/sync/types/sync-status-state-enum'
import { SyncTriggerEnum } from '../../../src/modules/sync/types/sync-trigger-enum'
import type { SyncReconciliationService } from '../../../src/modules/sync/sync-reconciliation.service'

const successfulResult = {
  pulledCount: 0,
  pushedCount: 0,
  downloadedAssetCount: 0,
  uploadedAssetCount: 0,
  cursor: 'cursor-1',
  followUpRun: false,
}

let databaseService: DatabaseService
let repository: SyncOrchestrationRepository
let createAdapter: ReturnType<typeof vi.fn>
let runReconciliation: ReturnType<typeof vi.fn>
let service: SyncOrchestrationService

const activateSynchronization = (provider = 'google-drive'): void => {
  databaseService
    .getConnection()
    .prepare(
      `UPDATE sync_account_state SET is_enabled = 1,
        active_provider = ?, connection_state = 'connected',
        provider_workspace_id = workspace_id WHERE id = 1`
    )
    .run(provider)
}

const createService = (): SyncOrchestrationService => {
  const reconciliationService = {
    run: runReconciliation,
  } as unknown as SyncReconciliationService
  const providerFactory: SyncProviderFactoryContract = {
    create: createAdapter,
  }

  return new SyncOrchestrationService(
    repository,
    reconciliationService,
    providerFactory as never,
    {
      localDebounceMs: 4_000,
      localDebounceMaxMs: 30_000,
      observerIntervalMs: 1_000,
      watchdogIntervalMs: 60_000,
      staleAfterMs: 60_000,
      retryBaseMs: 5_000,
      retryMaximumMs: 60_000,
      networkRecoveryJitterMs: 2_000,
      random: () => 0.5,
    }
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  repository = new SyncOrchestrationRepository(databaseService)
  createAdapter = vi.fn(() => ({}) as SyncProviderAdapter)
  runReconciliation = vi.fn().mockResolvedValue(successfulResult)
  service = createService()
})

afterEach(() => {
  service.onModuleDestroy()
  databaseService.close()
  vi.useRealTimers()
})

describe(SyncOrchestrationService.name, () => {
  it('keeps every trigger network-silent while synchronization is disabled', async () => {
    const triggers = Object.values(SyncTriggerEnum)

    for (const trigger of triggers) {
      await service.trigger(trigger)
    }
    await vi.runAllTimersAsync()

    expect(createAdapter).not.toHaveBeenCalled()
    expect(runReconciliation).not.toHaveBeenCalled()
    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.Disabled,
      isStartupReady: true,
      isEnabled: false,
    })
  })

  it('runs enabled synchronization and records public status metadata', async () => {
    activateSynchronization()

    await service.trigger(SyncTriggerEnum.Startup)

    expect(createAdapter).toHaveBeenCalledTimes(1)
    expect(runReconciliation).toHaveBeenCalledTimes(1)
    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.Synced,
      isEnabled: true,
      lastTrigger: SyncTriggerEnum.Startup,
      lastAttemptedAt: expect.any(String),
      lastSucceededAt: expect.any(String),
      lastErrorClassification: null,
      dataRevision: 1,
    })
  })

  it('serializes a trigger storm into one active run and one follow-up', async () => {
    activateSynchronization()
    let releaseRun: ((value: typeof successfulResult) => void) | undefined
    runReconciliation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseRun = resolve
        })
    )

    const first = service.trigger(SyncTriggerEnum.Manual)
    const second = service.trigger(SyncTriggerEnum.ProviderSignal)
    const third = service.trigger(SyncTriggerEnum.Watchdog)

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(runReconciliation).toHaveBeenCalledTimes(1)
    releaseRun?.(successfulResult)
    await first
    await Promise.resolve()
    await Promise.resolve()

    expect(runReconciliation).toHaveBeenCalledTimes(2)
  })

  it('debounces local changes and enforces the configured maximum delay', async () => {
    activateSynchronization()

    await service.trigger(SyncTriggerEnum.LocalMutation)
    await vi.advanceTimersByTimeAsync(3_999)
    expect(runReconciliation).not.toHaveBeenCalled()

    await service.trigger(SyncTriggerEnum.LocalMutation)
    await vi.advanceTimersByTimeAsync(4_000)
    expect(runReconciliation).toHaveBeenCalledTimes(1)
  })

  it('caps continuously debounced local changes at thirty seconds', async () => {
    activateSynchronization()

    for (let elapsed = 0; elapsed < 28_000; elapsed += 2_000) {
      await service.trigger(SyncTriggerEnum.LocalMutation)
      await vi.advanceTimersByTimeAsync(2_000)
    }

    expect(runReconciliation).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(runReconciliation).toHaveBeenCalledTimes(1)
  })

  it('runs focus and resume only after the last check becomes stale', async () => {
    activateSynchronization()

    await service.trigger(SyncTriggerEnum.Manual)
    await service.trigger(SyncTriggerEnum.Focus)
    await service.trigger(SyncTriggerEnum.Resume)
    expect(runReconciliation).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60_000)
    await service.trigger(SyncTriggerEnum.Focus)
    expect(runReconciliation).toHaveBeenCalledTimes(2)
  })

  it('retries transient failures exponentially and honors Retry-After', async () => {
    activateSynchronization()
    runReconciliation
      .mockRejectedValueOnce(
        new SyncProviderError(
          SyncProviderErrorKindEnum.Transient,
          'temporary provider failure',
          12_000
        )
      )
      .mockRejectedValueOnce(
        new SyncProviderError(
          SyncProviderErrorKindEnum.Transient,
          'second temporary provider failure'
        )
      )
      .mockResolvedValueOnce(successfulResult)

    await service.trigger(SyncTriggerEnum.Manual)
    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.Offline,
      lastErrorClassification: 'offline',
    })

    await vi.advanceTimersByTimeAsync(11_999)
    expect(runReconciliation).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(9_999)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(3)
    expect(service.getStatus().state).toBe(SyncStatusStateEnum.Synced)
  })

  it('adaptively polls OneDrive while enabled and stops after disabling', async () => {
    activateSynchronization('one-drive')

    await service.trigger(SyncTriggerEnum.Startup)
    expect(runReconciliation).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(44_999)
    expect(runReconciliation).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    databaseService
      .getConnection()
      .prepare('UPDATE sync_account_state SET is_enabled = 0 WHERE id = 1')
      .run()
    await service.trigger(SyncTriggerEnum.Manual)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(runReconciliation).toHaveBeenCalledTimes(2)
  })
  it('backs off adaptive OneDrive polling after consecutive empty deltas', async () => {
    activateSynchronization('one-drive')

    await service.trigger(SyncTriggerEnum.Startup)
    await vi.advanceTimersByTimeAsync(45_000)
    await vi.advanceTimersByTimeAsync(45_000)

    expect(runReconciliation).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(89_999)
    expect(runReconciliation).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(4)
  })

  it('lets the OneDrive scheduler own throttled Retry-After timing', async () => {
    activateSynchronization('one-drive')
    runReconciliation
      .mockResolvedValueOnce(successfulResult)
      .mockRejectedValueOnce(
        new SyncProviderError(
          SyncProviderErrorKindEnum.Throttled,
          'provider throttled the delta request',
          10 * 60_000
        )
      )
      .mockResolvedValueOnce(successfulResult)

    await service.trigger(SyncTriggerEnum.Startup)
    await vi.advanceTimersByTimeAsync(45_000)

    expect(runReconciliation).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(10 * 60_000 - 1)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(3)
  })

  it('keeps one Retry-After owner when a scheduled poll overlaps an ordinary run', async () => {
    activateSynchronization('one-drive')
    await service.trigger(SyncTriggerEnum.Startup)

    let rejectManualRun: ((error: Error) => void) | undefined
    runReconciliation.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectManualRun = reject
        })
    )
    const manualRun = service.trigger(SyncTriggerEnum.Manual)

    await vi.advanceTimersByTimeAsync(45_000)
    rejectManualRun?.(
      new SyncProviderError(
        SyncProviderErrorKindEnum.Throttled,
        'overlapping provider throttle',
        10 * 60_000
      )
    )
    await manualRun

    expect(runReconciliation).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(10 * 60_000 - 1)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(44_999)
    expect(runReconciliation).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(4)
  })

  it('switches OneDrive polling to background cadence until focus', async () => {
    activateSynchronization('one-drive')

    await service.trigger(SyncTriggerEnum.Startup)
    await service.trigger(SyncTriggerEnum.Background)
    await vi.advanceTimersByTimeAsync(749_999)

    expect(runReconciliation).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await service.trigger(SyncTriggerEnum.Focus)
    await vi.advanceTimersByTimeAsync(44_999)
    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    expect(runReconciliation).toHaveBeenCalledTimes(3)
  })

  it('reports unavailable providers without requesting credentials or retrying', async () => {
    activateSynchronization('one-drive')
    createAdapter.mockImplementation(() => {
      throw new SyncProviderUnavailableError('one-drive')
    })

    await service.trigger(SyncTriggerEnum.Manual)

    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.AttentionRequired,
      lastErrorClassification: 'provider-unavailable',
      provider: 'one-drive',
    })
    expect(runReconciliation).not.toHaveBeenCalled()
  })

  it('keeps enabled unbound states connecting and network-silent', async () => {
    databaseService
      .getConnection()
      .prepare(
        "UPDATE sync_account_state SET is_enabled = 1, active_provider = NULL, provider_workspace_id = NULL, connection_state = 'connecting' WHERE id = 1"
      )
      .run()

    await service.trigger(SyncTriggerEnum.Startup)

    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.Connecting,
      isEnabled: true,
      isStartupReady: false,
      provider: null,
      workspaceId: null,
    })
    expect(createAdapter).not.toHaveBeenCalled()

    databaseService
      .getConnection()
      .prepare(
        "UPDATE sync_account_state SET active_provider = 'google-drive' WHERE id = 1"
      )
      .run()

    await service.trigger(SyncTriggerEnum.Manual)

    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.Connecting,
      provider: 'google-drive',
      workspaceId: null,
    })
    expect(createAdapter).not.toHaveBeenCalled()
  })

  it('schedules one jittered network recovery run', async () => {
    activateSynchronization()

    await service.trigger(SyncTriggerEnum.NetworkRecovery)
    await service.trigger(SyncTriggerEnum.NetworkRecovery)
    await vi.advanceTimersByTimeAsync(999)

    expect(runReconciliation).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(runReconciliation).toHaveBeenCalledTimes(1)
  })

  it('schedules a post-push verification run after a successful push', async () => {
    activateSynchronization()
    runReconciliation
      .mockResolvedValueOnce({ ...successfulResult, pushedCount: 1 })
      .mockResolvedValueOnce(successfulResult)

    await service.trigger(SyncTriggerEnum.Manual)
    await vi.advanceTimersByTimeAsync(1_999)

    expect(runReconciliation).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)

    expect(runReconciliation).toHaveBeenCalledTimes(2)
  })

  it('surfaces unresolved conflicts as attention required', async () => {
    activateSynchronization()
    vi.spyOn(repository, 'countUnresolvedConflicts').mockReturnValue(1)

    await service.trigger(SyncTriggerEnum.Manual)

    expect(service.getStatus()).toMatchObject({
      state: SyncStatusStateEnum.AttentionRequired,
      unresolvedConflictCount: 1,
    })
  })

  it('observes durable outbox changes and runs the watchdog', async () => {
    activateSynchronization()
    vi.spyOn(repository, 'getPendingMutationSignature')
      .mockReturnValueOnce('0:')
      .mockReturnValueOnce('0:')
      .mockReturnValue('1:changed')

    service.onModuleInit()
    await vi.advanceTimersByTimeAsync(0)

    expect(runReconciliation).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5_000)

    expect(runReconciliation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(55_000)

    expect(runReconciliation).toHaveBeenCalledTimes(3)
  })

  it('invalidates the cursor before a repair run', async () => {
    activateSynchronization()
    const invalidateCursor = vi.spyOn(repository, 'invalidateActiveCursor')

    await service.repair()

    expect(invalidateCursor).toHaveBeenCalledWith('manual-repair')
    expect(runReconciliation).toHaveBeenCalledTimes(1)
    expect(service.getStatus().lastTrigger).toBe(SyncTriggerEnum.Repair)
  })

  it('keeps disconnect behind the T113 credential-removal boundary', () => {
    activateSynchronization()

    expect(() => service.requestDisconnect()).toThrow(
      'credential-removal workflow introduced by T113'
    )
    expect(repository.getAccountState()).toMatchObject({
      isEnabled: true,
      activeProvider: 'google-drive',
    })
  })
})
