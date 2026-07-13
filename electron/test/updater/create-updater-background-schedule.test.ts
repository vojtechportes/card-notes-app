import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createUpdaterBackgroundSchedule,
  updaterBackgroundCheckIntervalMs,
} from '../../src/updater/create-updater-background-schedule/create-updater-background-schedule'
import type { UpdaterService } from '../../src/updater/create-updater-service'
import type { UpdaterActionResult, UpdaterState } from '../../src/updater/updater-contract'

class FakeUpdaterService implements UpdaterService {
  checkForUpdatesCalls = 0
  checkForUpdatesSilentlyCalls = 0
  downloadUpdateCalls = 0
  installUpdateCalls = 0
  state: UpdaterState
  silentCheckHandler: () => Promise<UpdaterActionResult>

  constructor(state: UpdaterState) {
    this.state = state
    this.silentCheckHandler = async () => {
      this.checkForUpdatesSilentlyCalls += 1

      return {
        accepted: true,
        reason: null,
        state: this.state,
      }
    }
  }

  checkForUpdates(): Promise<UpdaterActionResult> {
    this.checkForUpdatesCalls += 1

    return Promise.resolve({
      accepted: true,
      reason: null,
      state: this.state,
    })
  }

  checkForUpdatesSilently(): Promise<UpdaterActionResult> {
    return this.silentCheckHandler()
  }

  downloadUpdate(): Promise<UpdaterActionResult> {
    this.downloadUpdateCalls += 1

    return Promise.resolve({
      accepted: true,
      reason: null,
      state: this.state,
    })
  }

  getState(): UpdaterState {
    return this.state
  }

  installUpdate(): Promise<UpdaterActionResult> {
    this.installUpdateCalls += 1

    return Promise.resolve({
      accepted: true,
      reason: null,
      state: this.state,
    })
  }
}

test('runs one startup background check and schedules hourly re-checks', async () => {
  const updaterService = new FakeUpdaterService({
    currentVersion: '1.0.3',
    kind: 'idle',
  })
  const scheduledIntervals: Array<{ callback: () => void; timeoutMs: number }> = []

  createUpdaterBackgroundSchedule({
    updaterService,
    scheduleInterval: ((callback: () => void, timeoutMs: number) => {
      scheduledIntervals.push({ callback, timeoutMs })
      return scheduledIntervals.length
    }) as typeof setInterval,
    clearScheduledInterval: (() => undefined) as typeof clearInterval,
  })

  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 1)
  assert.equal(scheduledIntervals.length, 1)
  assert.equal(scheduledIntervals[0]?.timeoutMs, updaterBackgroundCheckIntervalMs)

  scheduledIntervals[0]?.callback()
  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 2)
})

test('skips startup and scheduling when the updater is unavailable', async () => {
  const updaterService = new FakeUpdaterService({
    currentVersion: '1.0.3',
    kind: 'unavailable',
    reason: 'updater-disabled',
  })
  let scheduleCalls = 0

  createUpdaterBackgroundSchedule({
    updaterService,
    scheduleInterval: ((() => {
      scheduleCalls += 1
      return 1
    }) as unknown) as typeof setInterval,
    clearScheduledInterval: (() => undefined) as typeof clearInterval,
  })

  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 0)
  assert.equal(scheduleCalls, 0)
})

test('does not overlap background checks while a prior one is still running', async () => {
  const updaterService = new FakeUpdaterService({
    currentVersion: '1.0.3',
    kind: 'idle',
  })
  const scheduledIntervals: Array<() => void> = []
  let resolveCheck: (() => void) | null = null

  updaterService.silentCheckHandler = () => {
    updaterService.checkForUpdatesSilentlyCalls += 1

    return new Promise((resolve) => {
      resolveCheck = () => {
        resolve({
          accepted: true,
          reason: null,
          state: updaterService.state,
        })
      }
    })
  }

  createUpdaterBackgroundSchedule({
    updaterService,
    intervalMs: 50,
    scheduleInterval: ((callback: () => void) => {
      scheduledIntervals.push(callback)
      return scheduledIntervals.length
    }) as typeof setInterval,
    clearScheduledInterval: (() => undefined) as typeof clearInterval,
  })

  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 1)

  scheduledIntervals[0]?.()
  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 1)

  resolveCheck?.()
  await Promise.resolve()

  scheduledIntervals[0]?.()
  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 2)
})

test('skips scheduled checks while updater state is not idle or error', async () => {
  const updaterService = new FakeUpdaterService({
    currentVersion: '1.0.3',
    kind: 'available',
    update: {
      releaseDate: '2026-07-10T08:00:00.000Z',
      releaseName: 'NoteStack 1.1.0',
      version: '1.1.0',
    },
  })
  const scheduledIntervals: Array<() => void> = []

  createUpdaterBackgroundSchedule({
    updaterService,
    intervalMs: 50,
    scheduleInterval: ((callback: () => void) => {
      scheduledIntervals.push(callback)
      return scheduledIntervals.length
    }) as typeof setInterval,
    clearScheduledInterval: (() => undefined) as typeof clearInterval,
  })

  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 0)

  scheduledIntervals[0]?.()
  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 0)
})

test('keeps rejected background checks quiet', async () => {
  const updaterService = new FakeUpdaterService({
    currentVersion: '1.0.3',
    kind: 'idle',
  })
  const warnings: string[] = []

  updaterService.silentCheckHandler = async () => {
    updaterService.checkForUpdatesSilentlyCalls += 1

    return {
      accepted: false,
      reason: null,
      state: updaterService.state,
    }
  }

  createUpdaterBackgroundSchedule({
    updaterService,
    logger: {
      warn: (message) => {
        warnings.push(message)
      },
    },
    scheduleInterval: ((() => 1) as unknown) as typeof setInterval,
    clearScheduledInterval: (() => undefined) as typeof clearInterval,
  })

  await Promise.resolve()

  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 1)
  assert.deepEqual(warnings, [])
})

test('disposes the schedule and clears future interval work', async () => {
  const updaterService = new FakeUpdaterService({
    currentVersion: '1.0.3',
    kind: 'idle',
  })
  const scheduledIntervals: Array<() => void> = []
  const clearedIntervalIds: number[] = []

  const updaterBackgroundSchedule = createUpdaterBackgroundSchedule({
    updaterService,
    intervalMs: 50,
    scheduleInterval: ((callback: () => void) => {
      scheduledIntervals.push(callback)
      return scheduledIntervals.length
    }) as typeof setInterval,
    clearScheduledInterval: ((intervalId: number) => {
      clearedIntervalIds.push(intervalId)
    }) as typeof clearInterval,
  })

  await Promise.resolve()
  updaterBackgroundSchedule.dispose()

  scheduledIntervals[0]?.()
  await Promise.resolve()

  assert.deepEqual(clearedIntervalIds, [1])
  assert.equal(updaterService.checkForUpdatesSilentlyCalls, 1)
})
