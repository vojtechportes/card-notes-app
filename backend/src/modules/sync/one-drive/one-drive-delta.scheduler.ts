import {
  ONE_DRIVE_ACTIVE_MAX_POLL_MS,
  ONE_DRIVE_ACTIVE_MIN_POLL_MS,
  ONE_DRIVE_BACKGROUND_MAX_POLL_MS,
  ONE_DRIVE_BACKGROUND_MIN_POLL_MS,
  ONE_DRIVE_MAX_EMPTY_BACKOFF_MULTIPLIER,
  ONE_DRIVE_MAX_FAILURE_BACKOFF_MS,
} from './constants/one-drive.constants'
import type { OneDriveDeltaSchedulerOptions } from './types/one-drive-delta-scheduler-options'
import type { OneDriveDeltaTrigger } from './types/one-drive-delta-trigger'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'

export class OneDriveDeltaScheduler {
  private readonly poll: OneDriveDeltaSchedulerOptions['poll']
  private readonly random: () => number
  private readonly scheduleTimeout: typeof setTimeout
  private readonly cancelTimeout: typeof clearTimeout
  private enabled: boolean
  private active: boolean
  private disposed = false
  private running = false
  private pendingTrigger: OneDriveDeltaTrigger | null = null
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private emptyPollCount = 0
  private failureCount = 0
  private awaitingExternalPoll = false

  constructor(options: OneDriveDeltaSchedulerOptions) {
    this.poll = options.poll
    this.enabled = options.enabled ?? false
    this.active = options.active ?? true
    this.random = options.random ?? Math.random
    this.scheduleTimeout = options.scheduleTimeout ?? setTimeout
    this.cancelTimeout = options.cancelTimeout ?? clearTimeout
  }

  start(): Promise<void> {
    return this.trigger('startup')
  }

  setEnabled(enabled: boolean, synchronizeImmediately = true): Promise<void> {
    if (this.enabled === enabled) {
      return Promise.resolve()
    }

    this.enabled = enabled
    if (!enabled) {
      this.clearScheduledPoll()
      this.pendingTrigger = null
      this.awaitingExternalPoll = false
      return Promise.resolve()
    }

    if (!synchronizeImmediately) {
      return Promise.resolve()
    }

    return this.trigger('startup')
  }

  setActive(active: boolean): void {
    const becameActive = active && !this.active

    this.active = active
    if (becameActive) {
      this.emptyPollCount = 0
    }

    if (this.enabled && !this.running && !this.awaitingExternalPoll) {
      this.scheduleNextPoll(this.getSuccessDelay())
    }
  }

  completeExternalPoll(hasChanges: boolean): void {
    if (!this.awaitingExternalPoll) {
      return
    }

    this.awaitingExternalPoll = false
    this.failureCount = 0
    this.emptyPollCount = hasChanges ? 0 : this.emptyPollCount + 1
    if (this.enabled && !this.running && !this.disposed) {
      this.scheduleNextPoll(this.getSuccessDelay())
    }
  }

  async trigger(trigger: OneDriveDeltaTrigger): Promise<void> {
    if (!this.enabled || this.disposed) {
      return
    }

    this.clearScheduledPoll()
    if (trigger !== 'scheduled') {
      this.emptyPollCount = 0
    }

    if (this.running) {
      this.pendingTrigger = trigger
      return
    }

    await this.runPoll(trigger)
  }

  dispose(): void {
    this.disposed = true
    this.enabled = false
    this.pendingTrigger = null
    this.awaitingExternalPoll = false
    this.clearScheduledPoll()
  }

  private async runPoll(trigger: OneDriveDeltaTrigger): Promise<void> {
    this.running = true
    let nextDelay: number | null = null

    try {
      const result = await this.poll(trigger)
      this.failureCount = 0
      if (result.shouldSchedule === false) {
        this.awaitingExternalPoll = true
      } else {
        this.emptyPollCount = result.hasChanges ? 0 : this.emptyPollCount + 1
        nextDelay = Math.max(this.getSuccessDelay(), result.retryAfterMs ?? 0)
      }
    } catch (error) {
      nextDelay = this.getFailureDelay(error)
    } finally {
      this.running = false
    }

    if (!this.enabled || this.disposed) {
      return
    }

    const pendingTrigger = this.pendingTrigger
    this.pendingTrigger = null
    if (pendingTrigger) {
      await this.runPoll(pendingTrigger)
      return
    }

    if (nextDelay !== null) {
      this.scheduleNextPoll(nextDelay)
    }
  }

  private getSuccessDelay(): number {
    if (!this.active) {
      return this.randomBetween(
        ONE_DRIVE_BACKGROUND_MIN_POLL_MS,
        ONE_DRIVE_BACKGROUND_MAX_POLL_MS
      )
    }

    const baseDelay = this.randomBetween(
      ONE_DRIVE_ACTIVE_MIN_POLL_MS,
      ONE_DRIVE_ACTIVE_MAX_POLL_MS
    )
    const multiplier = Math.min(
      2 ** Math.max(0, this.emptyPollCount - 1),
      ONE_DRIVE_MAX_EMPTY_BACKOFF_MULTIPLIER
    )

    return Math.min(baseDelay * multiplier, ONE_DRIVE_BACKGROUND_MAX_POLL_MS)
  }

  private getFailureDelay(error: unknown): number | null {
    if (!(error instanceof SyncProviderError)) {
      this.failureCount += 1
      return this.getExponentialFailureDelay()
    }

    const retryableKinds = new Set([
      SyncProviderErrorKindEnum.Transient,
      SyncProviderErrorKindEnum.Throttled,
      SyncProviderErrorKindEnum.Quota,
    ])
    if (!retryableKinds.has(error.kind)) {
      return null
    }

    this.failureCount += 1

    return Math.max(this.getExponentialFailureDelay(), error.retryAfterMs ?? 0)
  }

  private getExponentialFailureDelay(): number {
    const exponential = Math.min(
      ONE_DRIVE_ACTIVE_MIN_POLL_MS * 2 ** Math.max(0, this.failureCount - 1),
      ONE_DRIVE_MAX_FAILURE_BACKOFF_MS
    )
    const jitter = 0.5 + this.random() * 0.5

    return Math.round(exponential * jitter)
  }

  private randomBetween(minimum: number, maximum: number): number {
    return Math.round(minimum + (maximum - minimum) * this.random())
  }

  private scheduleNextPoll(delay: number): void {
    this.clearScheduledPoll()
    this.timeoutId = this.scheduleTimeout(() => {
      this.timeoutId = null
      void this.trigger('scheduled')
    }, delay)
    this.timeoutId.unref?.()
  }

  private clearScheduledPoll(): void {
    if (this.timeoutId !== null) {
      this.cancelTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}
