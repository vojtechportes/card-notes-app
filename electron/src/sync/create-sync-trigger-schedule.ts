import type { SyncTrigger } from './types/sync-trigger.js'

interface SyncTriggerScheduleOptions {
  clearScheduledInterval?: typeof clearInterval
  isOnline: () => boolean
  onBackground: (listener: () => void) => () => void
  onFocus: (listener: () => void) => () => void
  onResume: (listener: () => void) => () => void
  pollIntervalMs?: number
  scheduleInterval?: typeof setInterval
  send: (trigger: SyncTrigger) => Promise<void> | void
}

export interface SyncTriggerSchedule {
  dispose: () => void
  flushBeforeQuit: () => Promise<void>
}

const DEFAULT_CONNECTIVITY_POLL_INTERVAL_MS = 5_000

export const createSyncTriggerSchedule = ({
  clearScheduledInterval = clearInterval,
  isOnline,
  onBackground,
  onFocus,
  onResume,
  pollIntervalMs = DEFAULT_CONNECTIVITY_POLL_INTERVAL_MS,
  scheduleInterval = setInterval,
  send,
}: SyncTriggerScheduleOptions): SyncTriggerSchedule => {
  let wasOnline = isOnline()
  const removeBackgroundListener = onBackground(() => send('background'))
  const removeFocusListener = onFocus(() => send('focus'))
  const removeResumeListener = onResume(() => send('resume'))
  const connectivityTimer = scheduleInterval(() => {
    const online = isOnline()

    if (online && !wasOnline) {
      send('network-recovery')
    }

    wasOnline = online
  }, pollIntervalMs)
  connectivityTimer.unref?.()

  return {
    dispose: () => {
      clearScheduledInterval(connectivityTimer)
      removeBackgroundListener()
      removeFocusListener()
      removeResumeListener()
    },
    flushBeforeQuit: () => Promise.resolve(send('quit')),
  }
}
