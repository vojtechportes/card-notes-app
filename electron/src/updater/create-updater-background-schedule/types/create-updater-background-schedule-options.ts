import type { UpdaterService } from '../../create-updater-service.js'
import type { LoggerLike } from './logger-like.js'

export interface CreateUpdaterBackgroundScheduleOptions {
  intervalMs?: number
  logger?: LoggerLike
  scheduleInterval?: typeof setInterval
  clearScheduledInterval?: typeof clearInterval
  updaterService: UpdaterService
}
