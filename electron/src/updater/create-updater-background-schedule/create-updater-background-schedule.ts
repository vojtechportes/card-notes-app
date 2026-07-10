import type { CreateUpdaterBackgroundScheduleOptions } from './types/create-updater-background-schedule-options.js'
import type { UpdaterBackgroundSchedule } from './types/updater-background-schedule.js'
export type { UpdaterBackgroundSchedule } from './types/updater-background-schedule.js'
import { canRunBackgroundCheck } from './utils/can-run-background-check.util.js'
import { shouldScheduleBackgroundChecks } from './utils/should-schedule-background-checks.util.js'

export const updaterBackgroundCheckIntervalMs = 60 * 60 * 1000

export const createUpdaterBackgroundSchedule = ({
  intervalMs = updaterBackgroundCheckIntervalMs,
  logger = console,
  scheduleInterval = setInterval,
  clearScheduledInterval = clearInterval,
  updaterService,
}: CreateUpdaterBackgroundScheduleOptions): UpdaterBackgroundSchedule => {
  if (!shouldScheduleBackgroundChecks(updaterService.getState())) {
    return {
      dispose: () => undefined,
    }
  }

  let intervalId: ReturnType<typeof setInterval> | null = null
  let isDisposed = false
  let isRunningCheck = false

  const runBackgroundCheck = async (): Promise<void> => {
    if (isDisposed || isRunningCheck) {
      return
    }

    if (!canRunBackgroundCheck(updaterService.getState())) {
      return
    }

    isRunningCheck = true

    try {
      await updaterService.checkForUpdatesSilently()
    } catch (error) {
      logger.warn('A background updater check failed unexpectedly.', error)
    } finally {
      isRunningCheck = false
    }
  }

  void runBackgroundCheck()

  intervalId = scheduleInterval(() => {
    void runBackgroundCheck()
  }, intervalMs)

  return {
    dispose: () => {
      isDisposed = true

      if (intervalId !== null) {
        clearScheduledInterval(intervalId)
        intervalId = null
      }
    },
  }
}
