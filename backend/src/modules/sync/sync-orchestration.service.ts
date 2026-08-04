import {
  ConflictException,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common'
import { SyncOrchestrationRepository } from './sync-orchestration.repository'
import { OneDriveDeltaScheduler } from './one-drive/one-drive-delta.scheduler'
import { SyncProviderFactory } from './sync-provider.factory'
import { SyncReconciliationService } from './sync-reconciliation.service'
import type { SyncAccountState } from './types/sync-account-state'
import type { SyncOrchestrationOptions } from './types/sync-orchestration-options'
import type { SyncProviderFactoryContract } from './types/sync-provider-factory-contract'
import type { SyncPublicStatus } from './types/sync-public-status'
import type { SyncRunOutcome } from './types/sync-run-outcome'
import { SyncErrorClassificationEnum } from './types/sync-error-classification-enum'
import { SyncProviderError } from './types/sync-provider-error'
import { SyncProviderErrorKindEnum } from './types/sync-provider-error-kind-enum'
import { SyncProviderEnum } from './types/sync-provider-enum'
import { SyncProviderUnavailableError } from './types/sync-provider-unavailable-error'
import { SyncStatusStateEnum } from './types/sync-status-state-enum'
import { SyncTriggerEnum } from './types/sync-trigger-enum'

const DEFAULT_LOCAL_DEBOUNCE_MS = 4_000
const DEFAULT_LOCAL_DEBOUNCE_MAX_MS = 30_000
const DEFAULT_OBSERVER_INTERVAL_MS = 1_000
const DEFAULT_WATCHDOG_INTERVAL_MS = 15 * 60_000
const DEFAULT_STALE_AFTER_MS = 60_000
const DEFAULT_RETRY_BASE_MS = 5_000
const DEFAULT_RETRY_MAXIMUM_MS = 15 * 60_000
const DEFAULT_NETWORK_RECOVERY_JITTER_MS = 2_000
const POST_PUSH_VERIFICATION_DELAY_MS = 2_000

@Injectable()
export class SyncOrchestrationService implements OnModuleInit, OnModuleDestroy {
  private readonly options: Required<SyncOrchestrationOptions>
  private state: SyncStatusStateEnum
  private lastErrorClassification: SyncErrorClassificationEnum | null = null
  private lastTrigger: SyncTriggerEnum | null = null
  private startupReady = false
  private dataRevision = 0
  private retryAttempt = 0
  private activeRun: Promise<SyncPublicStatus> | null = null
  private activeRunOutcome: Promise<SyncRunOutcome> | null = null
  private pendingRun = false
  private destroyed = false
  private observedOutboxSignature = ''
  private localDebounceStartedAt: number | null = null
  private localDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private delayedTriggerTimer: ReturnType<typeof setTimeout> | null = null
  private observerTimer: ReturnType<typeof setInterval> | null = null
  private watchdogTimer: ReturnType<typeof setInterval> | null = null
  private readonly oneDriveScheduler: OneDriveDeltaScheduler
  private oneDrivePollingEnabled = false

  constructor(
    @Inject(SyncOrchestrationRepository)
    private readonly repository: SyncOrchestrationRepository,
    @Inject(SyncReconciliationService)
    private readonly reconciliationService: SyncReconciliationService,
    @Inject(SyncProviderFactory)
    private readonly providerFactory: SyncProviderFactoryContract,
    @Optional() options: SyncOrchestrationOptions = {}
  ) {
    this.state = SyncStatusStateEnum.Disabled
    this.options = {
      localDebounceMs: options.localDebounceMs ?? DEFAULT_LOCAL_DEBOUNCE_MS,
      localDebounceMaxMs:
        options.localDebounceMaxMs ?? DEFAULT_LOCAL_DEBOUNCE_MAX_MS,
      observerIntervalMs:
        options.observerIntervalMs ?? DEFAULT_OBSERVER_INTERVAL_MS,
      watchdogIntervalMs:
        options.watchdogIntervalMs ?? DEFAULT_WATCHDOG_INTERVAL_MS,
      staleAfterMs: options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS,
      retryBaseMs: options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS,
      retryMaximumMs: options.retryMaximumMs ?? DEFAULT_RETRY_MAXIMUM_MS,
      networkRecoveryJitterMs:
        options.networkRecoveryJitterMs ?? DEFAULT_NETWORK_RECOVERY_JITTER_MS,
      random: options.random ?? Math.random,
    }
    this.oneDriveScheduler = new OneDriveDeltaScheduler({
      enabled: false,
      poll: async () => {
        const joinedOrdinaryRun = this.activeRunOutcome !== null
        const outcome = await this.startOrJoinRun(
          SyncTriggerEnum.Watchdog,
          false,
          false
        )

        if (outcome.error) {
          if (joinedOrdinaryRun && outcome.retryScheduled) {
            return { hasChanges: false, shouldSchedule: false }
          }

          throw outcome.error
        }

        return { hasChanges: outcome.hasChanges }
      },
      random: this.options.random,
    })
  }

  onModuleInit(): void {
    const account = this.repository.getAccountState()

    this.state = this.getRestingState(account)
    this.startupReady = !account.isEnabled
    this.observedOutboxSignature = this.repository.getPendingMutationSignature()
    this.observerTimer = setInterval(
      () => this.observeLocalMutations(),
      this.options.observerIntervalMs
    )
    this.watchdogTimer = setInterval(() => {
      void this.trigger(SyncTriggerEnum.Watchdog)
    }, this.options.watchdogIntervalMs)
    this.observerTimer.unref?.()
    this.watchdogTimer.unref?.()

    void this.trigger(SyncTriggerEnum.Startup)
  }

  onModuleDestroy(): void {
    this.destroyed = true
    this.oneDriveScheduler.dispose()
    this.clearTimer(this.localDebounceTimer)
    this.clearTimer(this.retryTimer)
    this.clearTimer(this.delayedTriggerTimer)
    if (this.observerTimer) {
      clearInterval(this.observerTimer)
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
    }
  }

  getStatus(): SyncPublicStatus {
    const account = this.repository.getAccountState()
    const storedClassification = account.lastErrorClassification
    const classification =
      this.lastErrorClassification ??
      this.toKnownClassification(storedClassification)

    let state = this.state
    if (!account.isEnabled) {
      state = SyncStatusStateEnum.Disabled
    } else if (!this.hasActiveBinding(account)) {
      state = SyncStatusStateEnum.Connecting
    }

    return {
      state,
      isEnabled: account.isEnabled,
      provider: account.activeProvider,
      accountId: account.providerAccountId,
      accountDisplayName: account.providerAccountDisplayName,
      workspaceId: account.providerWorkspaceId,
      workspaceDisplayName: account.providerWorkspaceDisplayName,
      pendingMutationCount: this.repository.countPendingMutations(),
      unresolvedConflictCount: this.repository.countUnresolvedConflicts(),
      lastAttemptedAt: account.lastAttemptedAt,
      lastSucceededAt: account.lastSucceededAt,
      lastErrorClassification: classification,
      lastTrigger: this.lastTrigger,
      isStartupReady: this.startupReady || !account.isEnabled,
      dataRevision: this.dataRevision,
    }
  }

  trigger(trigger: SyncTriggerEnum): Promise<SyncPublicStatus> {
    const account = this.repository.getAccountState()
    const shouldPollOneDrive =
      account.isEnabled &&
      account.activeProvider === SyncProviderEnum.OneDrive &&
      Boolean(account.providerWorkspaceId)

    if (shouldPollOneDrive && !this.oneDrivePollingEnabled) {
      this.oneDrivePollingEnabled = true
      void this.oneDriveScheduler.setEnabled(true, false)
      this.oneDriveScheduler.setActive(true)
    }

    if (!shouldPollOneDrive && this.oneDrivePollingEnabled) {
      this.oneDrivePollingEnabled = false
      void this.oneDriveScheduler.setEnabled(false)
    }

    if (!account.isEnabled) {
      this.state = SyncStatusStateEnum.Disabled
      this.startupReady = true

      return Promise.resolve(this.getStatus())
    }

    if (!this.hasActiveBinding(account)) {
      this.state = SyncStatusStateEnum.Connecting
      this.startupReady = false

      return Promise.resolve(this.getStatus())
    }

    if (trigger === SyncTriggerEnum.Background) {
      this.oneDriveScheduler.setActive(false)

      return Promise.resolve(this.getStatus())
    }

    if (
      trigger === SyncTriggerEnum.Focus ||
      trigger === SyncTriggerEnum.Resume
    ) {
      this.oneDriveScheduler.setActive(true)
    }

    if (
      (trigger === SyncTriggerEnum.Focus ||
        trigger === SyncTriggerEnum.Resume) &&
      !this.isStale(account.lastAttemptedAt)
    ) {
      return Promise.resolve(this.getStatus())
    }

    if (trigger === SyncTriggerEnum.LocalMutation) {
      this.scheduleLocalMutation()
      return Promise.resolve(this.getStatus())
    }

    if (trigger === SyncTriggerEnum.NetworkRecovery) {
      const delay = Math.floor(
        this.options.random() * this.options.networkRecoveryJitterMs
      )
      this.scheduleDelayedTrigger(trigger, delay)
      return Promise.resolve(this.getStatus())
    }

    return this.run(trigger)
  }

  requestDisconnect(): never {
    throw new ConflictException(
      'Disconnect requires the credential-removal workflow introduced by T113.'
    )
  }

  requestProviderSwitch(): never {
    throw new ConflictException(
      'Provider switching requires the pairing workflow introduced by T113.'
    )
  }

  requestReset(): never {
    throw new ConflictException(
      'Synchronization reset requires the repair workflow introduced by T113.'
    )
  }

  repair(): Promise<SyncPublicStatus> {
    this.repository.invalidateActiveCursor('manual-repair')
    return this.trigger(SyncTriggerEnum.Repair)
  }

  private run(trigger: SyncTriggerEnum): Promise<SyncPublicStatus> {
    void this.startOrJoinRun(trigger, true, true)

    return this.activeRun!
  }

  private startOrJoinRun(
    trigger: SyncTriggerEnum,
    scheduleRetry: boolean,
    queueFollowUpWhenJoined: boolean
  ): Promise<SyncRunOutcome> {
    if (this.activeRunOutcome) {
      if (queueFollowUpWhenJoined) {
        this.pendingRun = true
      }

      return this.activeRunOutcome
    }

    this.lastTrigger = trigger
    this.activeRunOutcome = this.executeRun(trigger, scheduleRetry).finally(
      () => {
        this.activeRun = null
        this.activeRunOutcome = null

        if (this.pendingRun && !this.destroyed) {
          this.pendingRun = false
          queueMicrotask(() => {
            void this.run(this.lastTrigger ?? SyncTriggerEnum.Watchdog)
          })
        }
      }
    )
    this.activeRun = this.activeRunOutcome.then(({ status }) => status)

    return this.activeRunOutcome
  }

  private async executeRun(
    trigger: SyncTriggerEnum,
    scheduleRetry: boolean
  ): Promise<SyncRunOutcome> {
    const account = this.repository.getAccountState()
    if (!account.isEnabled || !this.hasActiveBinding(account)) {
      return {
        status: this.getStatus(),
        hasChanges: false,
        error: null,
        retryScheduled: false,
      }
    }

    const activeProvider = account.activeProvider
    if (!activeProvider) {
      return {
        status: this.getStatus(),
        hasChanges: false,
        error: null,
        retryScheduled: false,
      }
    }

    const attemptedAt = new Date().toISOString()
    this.state = SyncStatusStateEnum.Syncing
    this.repository.recordAttempt(attemptedAt)

    try {
      const adapter = this.providerFactory.create(
        activeProvider,
        account.workspaceId
      )
      const result = await this.reconciliationService.run(adapter, {
        claimedBy: `orchestrator:${trigger}`,
      })
      const succeededAt = new Date().toISOString()
      const hasChanges =
        result.pulledCount > 0 ||
        result.pushedCount > 0 ||
        result.downloadedAssetCount > 0 ||
        result.uploadedAssetCount > 0

      this.repository.recordSuccess(succeededAt)
      this.retryAttempt = 0
      this.lastErrorClassification = null
      this.startupReady = true
      this.dataRevision += 1
      this.state =
        this.repository.countUnresolvedConflicts() > 0
          ? SyncStatusStateEnum.AttentionRequired
          : SyncStatusStateEnum.Synced
      this.clearTimer(this.retryTimer)
      this.retryTimer = null
      this.observedOutboxSignature =
        this.repository.getPendingMutationSignature()

      if (activeProvider === SyncProviderEnum.OneDrive) {
        this.oneDriveScheduler.completeExternalPoll(hasChanges)
      }

      if (result.pushedCount > 0) {
        this.scheduleDelayedTrigger(
          SyncTriggerEnum.PostPushVerification,
          POST_PUSH_VERIFICATION_DELAY_MS
        )
      }

      return {
        status: this.getStatus(),
        hasChanges,
        error: null,
        retryScheduled: false,
      }
    } catch (error) {
      const retryScheduled = this.handleFailure(error, scheduleRetry)

      return {
        status: this.getStatus(),
        hasChanges: false,
        error,
        retryScheduled,
      }
    }
  }

  private handleFailure(error: unknown, scheduleRetry: boolean): boolean {
    const classification = this.classifyError(error)
    const requiresAttention = [
      SyncErrorClassificationEnum.AuthenticationRequired,
      SyncErrorClassificationEnum.ProviderUnavailable,
      SyncErrorClassificationEnum.RemoteAttentionRequired,
      SyncErrorClassificationEnum.UnsupportedRemoteVersion,
    ].includes(classification)
    const isRetryable = [
      SyncErrorClassificationEnum.Offline,
      SyncErrorClassificationEnum.Throttled,
      SyncErrorClassificationEnum.QuotaExceeded,
    ].includes(classification)

    this.lastErrorClassification = classification
    this.startupReady = true
    if (requiresAttention) {
      this.state = SyncStatusStateEnum.AttentionRequired
    } else if (classification === SyncErrorClassificationEnum.Offline) {
      this.state = SyncStatusStateEnum.Offline
    } else {
      this.state = SyncStatusStateEnum.Error
    }
    this.repository.recordFailure(
      classification,
      requiresAttention,
      new Date().toISOString()
    )

    const shouldScheduleRetry = isRetryable && scheduleRetry
    if (shouldScheduleRetry) {
      this.scheduleRetry(error)
    }

    return shouldScheduleRetry
  }

  private classifyError(error: unknown): SyncErrorClassificationEnum {
    if (error instanceof SyncProviderUnavailableError) {
      return SyncErrorClassificationEnum.ProviderUnavailable
    }
    if (
      /requires a newer application version/i.test(this.getErrorMessage(error))
    ) {
      return SyncErrorClassificationEnum.UnsupportedRemoteVersion
    }
    if (!(error instanceof SyncProviderError)) {
      return SyncErrorClassificationEnum.Unknown
    }

    switch (error.kind) {
      case SyncProviderErrorKindEnum.Authentication:
        return SyncErrorClassificationEnum.AuthenticationRequired
      case SyncProviderErrorKindEnum.Throttled:
        return SyncErrorClassificationEnum.Throttled
      case SyncProviderErrorKindEnum.Quota:
        return SyncErrorClassificationEnum.QuotaExceeded
      case SyncProviderErrorKindEnum.Transient:
        return SyncErrorClassificationEnum.Offline
      case SyncProviderErrorKindEnum.InvalidCursor:
      case SyncProviderErrorKindEnum.NotFound:
        return SyncErrorClassificationEnum.RemoteAttentionRequired
      case SyncProviderErrorKindEnum.Permanent:
      case SyncProviderErrorKindEnum.PreconditionFailed:
        return SyncErrorClassificationEnum.Permanent
    }
  }

  private scheduleRetry(error: unknown): void {
    this.clearTimer(this.retryTimer)
    const exponentialDelay = Math.min(
      this.options.retryMaximumMs,
      this.options.retryBaseMs * 2 ** this.retryAttempt
    )
    const jitteredDelay = Math.floor(
      exponentialDelay * (0.75 + this.options.random() * 0.5)
    )
    const retryAfterMs =
      error instanceof SyncProviderError ? (error.retryAfterMs ?? 0) : 0
    const delay = Math.max(jitteredDelay, retryAfterMs)

    this.retryAttempt += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.run(this.lastTrigger ?? SyncTriggerEnum.Watchdog)
    }, delay)
    this.retryTimer.unref?.()
  }

  private scheduleLocalMutation(): void {
    const now = Date.now()
    this.localDebounceStartedAt ??= now
    const elapsed = now - this.localDebounceStartedAt
    const delay = Math.min(
      this.options.localDebounceMs,
      Math.max(0, this.options.localDebounceMaxMs - elapsed)
    )

    this.clearTimer(this.localDebounceTimer)
    this.localDebounceTimer = setTimeout(() => {
      this.localDebounceTimer = null
      this.localDebounceStartedAt = null
      void this.run(SyncTriggerEnum.LocalMutation)
    }, delay)
    this.localDebounceTimer.unref?.()
  }

  private scheduleDelayedTrigger(
    trigger: SyncTriggerEnum,
    delay: number
  ): void {
    if (this.delayedTriggerTimer) {
      this.pendingRun = this.activeRun !== null || this.pendingRun
      return
    }

    this.delayedTriggerTimer = setTimeout(() => {
      this.delayedTriggerTimer = null
      void this.run(trigger)
    }, delay)
    this.delayedTriggerTimer.unref?.()
  }

  private observeLocalMutations(): void {
    const account = this.repository.getAccountState()
    if (!account.isEnabled) {
      this.observedOutboxSignature =
        this.repository.getPendingMutationSignature()
      return
    }

    const signature = this.repository.getPendingMutationSignature()
    if (signature !== this.observedOutboxSignature) {
      this.observedOutboxSignature = signature
      void this.trigger(SyncTriggerEnum.LocalMutation)
    }
  }

  private getRestingState(account: SyncAccountState): SyncStatusStateEnum {
    if (!account.isEnabled) {
      return SyncStatusStateEnum.Disabled
    }
    if (!this.hasActiveBinding(account)) {
      return SyncStatusStateEnum.Connecting
    }
    if (account.connectionState === 'attention-required') {
      return SyncStatusStateEnum.AttentionRequired
    }

    return SyncStatusStateEnum.Synced
  }

  private hasActiveBinding(account: SyncAccountState): boolean {
    return Boolean(account.activeProvider && account.providerWorkspaceId)
  }

  private isStale(lastAttemptedAt: string | null): boolean {
    if (!lastAttemptedAt) {
      return true
    }

    return Date.now() - Date.parse(lastAttemptedAt) >= this.options.staleAfterMs
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer) {
      clearTimeout(timer)
    }
  }

  private toKnownClassification(
    value: string | null
  ): SyncErrorClassificationEnum | null {
    if (!value) {
      return null
    }

    const known = Object.values(SyncErrorClassificationEnum)
    return known.includes(value as SyncErrorClassificationEnum)
      ? (value as SyncErrorClassificationEnum)
      : SyncErrorClassificationEnum.Unknown
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
