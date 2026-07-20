import assert from 'node:assert/strict'
import test from 'node:test'
import type { BrowserWindow } from 'electron'
import { registerWindowControlsStateEvents } from '../../src/window-controls/register-window-controls-state-events'

interface BrowserWindowHarness {
  browserWindow: BrowserWindow
  emit: (event: 'maximize' | 'unmaximize') => void
  sentStates: unknown[]
  setMaximized: (isMaximized: boolean) => void
}

const createBrowserWindowHarness = (): BrowserWindowHarness => {
  let isMaximized = false
  const listeners = new Map<string, () => void>()
  const sentStates: unknown[] = []

  return {
    browserWindow: {
      isMaximized: () => isMaximized,
      on: (event: string, listener: () => void) => {
        listeners.set(event, listener)
      },
      webContents: {
        send: (channel: string, state: unknown) => {
          sentStates.push({ channel, state })
        },
      },
    } as unknown as BrowserWindow,
    emit: (event) => listeners.get(event)?.(),
    sentStates,
    setMaximized: (nextIsMaximized) => {
      isMaximized = nextIsMaximized
    },
  }
}

test('emits synchronized state when a window is maximized and restored', () => {
  const harness = createBrowserWindowHarness()

  registerWindowControlsStateEvents(harness.browserWindow)

  harness.setMaximized(true)
  harness.emit('maximize')
  harness.setMaximized(false)
  harness.emit('unmaximize')

  assert.deepEqual(harness.sentStates, [
    {
      channel: 'window-controls:state-changed',
      state: { isMaximized: true },
    },
    {
      channel: 'window-controls:state-changed',
      state: { isMaximized: false },
    },
  ])
})
