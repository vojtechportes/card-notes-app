import { describe, expect, it, vi } from 'vitest'
import { ONE_DRIVE_BACKGROUND_MIN_POLL_MS } from '../../../../src/modules/sync/one-drive/constants/one-drive.constants'
import { OneDriveDeltaScheduler } from '../../../../src/modules/sync/one-drive/one-drive-delta.scheduler'
import { SyncProviderError } from '../../../../src/modules/sync/types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../../../src/modules/sync/types/sync-provider-error-kind-enum'
import type { OneDriveDeltaTrigger } from '../../../../src/modules/sync/one-drive/types/one-drive-delta-trigger'

interface ScheduledTimeout {
  callback: () => void
  delay: number
  id: number
}

const createTimeoutHarness = () => {
  const scheduled: ScheduledTimeout[] = []
  let nextId = 1
  const scheduleTimeout = ((callback: () => void, delay?: number) => {
    const id = nextId
    nextId += 1
    scheduled.push({ callback, delay: delay ?? 0, id })

    return id
  }) as unknown as typeof setTimeout
  const cancelTimeout = ((id: number) => {
    const index = scheduled.findIndex((timeout) => timeout.id === id)
    if (index >= 0) {
      scheduled.splice(index, 1)
    }
  }) as unknown as typeof clearTimeout
  const runNext = async (): Promise<void> => {
    const timeout = scheduled.shift()
    if (!timeout) {
      throw new Error('No scheduled timeout.')
    }

    timeout.callback()
    await Promise.resolve()
    await Promise.resolve()
  }

  return { scheduled, scheduleTimeout, cancelTimeout, runNext }
}

describe('OneDriveDeltaScheduler', () => {
  it('does nothing while disabled and polls immediately when enabled', async () => {
    const poll = vi.fn().mockResolvedValue({ hasChanges: false })
    const timers = createTimeoutHarness()
    const scheduler = new OneDriveDeltaScheduler({
      poll,
      random: () => 0,
      scheduleTimeout: timers.scheduleTimeout,
      cancelTimeout: timers.cancelTimeout,
    })

    await scheduler.start()
    expect(poll).not.toHaveBeenCalled()

    await scheduler.setEnabled(true)
    expect(poll).toHaveBeenCalledWith('startup')
    expect(timers.scheduled[0].delay).toBe(30_000)
  })

  it('runs every immediate lifecycle trigger and resets idle backoff', async () => {
    const triggers: OneDriveDeltaTrigger[] = []
    const results = [false, false, true, false, false, false]
    const timers = createTimeoutHarness()
    const scheduler = new OneDriveDeltaScheduler({
      enabled: true,
      poll: async (trigger) => {
        triggers.push(trigger)
        return { hasChanges: results.shift() ?? false }
      },
      random: () => 0,
      scheduleTimeout: timers.scheduleTimeout,
      cancelTimeout: timers.cancelTimeout,
    })

    await scheduler.start()
    expect(timers.scheduled[0].delay).toBe(30_000)
    await timers.runNext()
    expect(timers.scheduled[0].delay).toBe(60_000)
    await scheduler.trigger('manual')
    expect(timers.scheduled[0].delay).toBe(30_000)
    await scheduler.trigger('focus')
    await scheduler.trigger('resume')
    await scheduler.trigger('network-recovery')

    expect(triggers).toEqual([
      'startup',
      'scheduled',
      'manual',
      'focus',
      'resume',
      'network-recovery',
    ])
  })

  it('uses a ten-to-fifteen minute background watchdog', async () => {
    const timers = createTimeoutHarness()
    const scheduler = new OneDriveDeltaScheduler({
      enabled: true,
      active: false,
      poll: async () => ({ hasChanges: false }),
      random: () => 0,
      scheduleTimeout: timers.scheduleTimeout,
      cancelTimeout: timers.cancelTimeout,
    })

    await scheduler.start()

    expect(timers.scheduled[0].delay).toBe(ONE_DRIVE_BACKGROUND_MIN_POLL_MS)
  })

  it('honors Retry-After above exponential jitter backoff', async () => {
    const timers = createTimeoutHarness()
    const scheduler = new OneDriveDeltaScheduler({
      enabled: true,
      poll: async () => {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.Throttled,
          'Slow down.',
          120_000
        )
      },
      random: () => 0,
      scheduleTimeout: timers.scheduleTimeout,
      cancelTimeout: timers.cancelTimeout,
    })

    await scheduler.start()

    expect(timers.scheduled[0].delay).toBe(120_000)
  })

  it('coalesces triggers without overlapping polls', async () => {
    let resolveFirst: (() => void) | undefined
    let activePolls = 0
    let maximumActivePolls = 0
    const triggers: OneDriveDeltaTrigger[] = []
    const timers = createTimeoutHarness()
    const firstPoll = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const scheduler = new OneDriveDeltaScheduler({
      enabled: true,
      poll: async (trigger) => {
        triggers.push(trigger)
        activePolls += 1
        maximumActivePolls = Math.max(maximumActivePolls, activePolls)
        if (triggers.length === 1) {
          await firstPoll
        }
        activePolls -= 1

        return { hasChanges: false }
      },
      random: () => 0,
      scheduleTimeout: timers.scheduleTimeout,
      cancelTimeout: timers.cancelTimeout,
    })

    const startup = scheduler.start()
    await Promise.resolve()
    await scheduler.trigger('focus')
    await scheduler.trigger('manual')
    resolveFirst?.()
    await startup

    expect(maximumActivePolls).toBe(1)
    expect(triggers).toEqual(['startup', 'manual'])
  })

  it('cancels the watchdog when disposed', async () => {
    const timers = createTimeoutHarness()
    const scheduler = new OneDriveDeltaScheduler({
      enabled: true,
      poll: async () => ({ hasChanges: false }),
      scheduleTimeout: timers.scheduleTimeout,
      cancelTimeout: timers.cancelTimeout,
    })

    await scheduler.start()
    expect(timers.scheduled).toHaveLength(1)
    scheduler.dispose()
    expect(timers.scheduled).toHaveLength(0)
    await scheduler.trigger('manual')
    expect(timers.scheduled).toHaveLength(0)
  })
})
