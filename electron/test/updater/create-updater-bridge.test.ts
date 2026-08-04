import assert from 'node:assert/strict'
import test from 'node:test'
import { createUpdaterBridge } from '../../src/updater/create-updater-bridge'
import { updaterIpcChannels } from '../../src/updater/updater-ipc-channels'
import type { UpdaterState } from '../../src/updater/updater-contract'

interface RecordedListener {
  channel: string
  listener: (...args: unknown[]) => void
}

class FakeIpcRenderer {
  invocationArguments: unknown[][] = []
  invokes: string[] = []
  listeners: RecordedListener[] = []
  removedListeners: RecordedListener[] = []

  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    this.invocationArguments.push(args)
    this.invokes.push(channel)

    return Promise.resolve(channel)
  }

  on(channel: string, listener: (...args: unknown[]) => void): this {
    this.listeners.push({ channel, listener })

    return this
  }

  removeListener(
    channel: string,
    listener: (...args: unknown[]) => void
  ): this {
    this.removedListeners.push({ channel, listener })

    return this
  }
}

test('proxies updater commands through the narrow IPC contract', async () => {
  const ipcRenderer = new FakeIpcRenderer()
  const updaterBridge = createUpdaterBridge(ipcRenderer)

  await updaterBridge.getPreferences()
  await updaterBridge.getState()
  await updaterBridge.checkForUpdates()
  await updaterBridge.downloadUpdate()
  await updaterBridge.installUpdate()
  await updaterBridge.setAllowPrerelease(true)

  assert.deepEqual(ipcRenderer.invokes, [
    updaterIpcChannels.getPreferences,
    updaterIpcChannels.getState,
    updaterIpcChannels.checkForUpdates,
    updaterIpcChannels.downloadUpdate,
    updaterIpcChannels.installUpdate,
    updaterIpcChannels.setAllowPrerelease,
  ])
  assert.deepEqual(ipcRenderer.invocationArguments.at(-1), [true])
})

test('subscribes and unsubscribes updater state listeners', () => {
  const ipcRenderer = new FakeIpcRenderer()
  const updaterBridge = createUpdaterBridge(ipcRenderer)
  const receivedStates: UpdaterState[] = []

  const unsubscribe = updaterBridge.subscribe((state) => {
    receivedStates.push(state)
  })

  assert.equal(ipcRenderer.listeners.length, 1)
  assert.equal(
    ipcRenderer.listeners[0]?.channel,
    updaterIpcChannels.stateChanged
  )

  const state: UpdaterState = {
    currentVersion: '1.0.3',
    kind: 'checking',
  }

  ipcRenderer.listeners[0]?.listener({}, state)
  unsubscribe()

  assert.deepEqual(receivedStates, [state])
  assert.equal(ipcRenderer.removedListeners.length, 1)
  assert.equal(
    ipcRenderer.removedListeners[0]?.channel,
    updaterIpcChannels.stateChanged
  )
})
