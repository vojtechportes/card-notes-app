import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncTriggerSchedule } from '../../src/sync/create-sync-trigger-schedule.js'
import type { SyncTrigger } from '../../src/sync/types/sync-trigger.js'

const listeners = () => {
  let background: (() => void) | null = null
  let focus: (() => void) | null = null
  let resume: (() => void) | null = null

  return {
    emitBackground: () => background?.(),
    emitFocus: () => focus?.(),
    emitResume: () => resume?.(),
    onBackground: (listener: () => void) => {
      background = listener

      return () => {
        background = null
      }
    },
    onFocus: (listener: () => void) => {
      focus = listener

      return () => {
        focus = null
      }
    },
    onResume: (listener: () => void) => {
      resume = listener

      return () => {
        resume = null
      }
    },
  }
}

test('forwards background, focus, resume, network recovery, and quit triggers', () => {
  const events = listeners()
  const sent: SyncTrigger[] = []
  let online = false
  let pollConnectivity: (() => void) | null = null
  const schedule = createSyncTriggerSchedule({
    clearScheduledInterval: (() => undefined) as typeof clearInterval,
    isOnline: () => online,
    onBackground: events.onBackground,
    onFocus: events.onFocus,
    onResume: events.onResume,
    scheduleInterval: ((callback: () => void) => {
      pollConnectivity = callback

      return 1
    }) as unknown as typeof setInterval,
    send: (trigger) => sent.push(trigger),
  })

  events.emitBackground()
  events.emitFocus()
  events.emitResume()
  online = true
  pollConnectivity?.()
  schedule.flushBeforeQuit()

  assert.deepEqual(sent, [
    'background',
    'focus',
    'resume',
    'network-recovery',
    'quit',
  ])
  schedule.dispose()
})

test('removes listeners and polling when disposed', () => {
  const events = listeners()
  const sent: SyncTrigger[] = []
  let online = false
  let intervalWasCleared = false
  const schedule = createSyncTriggerSchedule({
    clearScheduledInterval: (() => {
      intervalWasCleared = true
    }) as typeof clearInterval,
    isOnline: () => online,
    onBackground: events.onBackground,
    onFocus: events.onFocus,
    onResume: events.onResume,
    scheduleInterval: (() => 1) as unknown as typeof setInterval,
    send: (trigger) => sent.push(trigger),
  })

  schedule.dispose()
  events.emitBackground()
  events.emitFocus()
  events.emitResume()
  online = true

  assert.equal(intervalWasCleared, true)
  assert.deepEqual(sent, [])
})
