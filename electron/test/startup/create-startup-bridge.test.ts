import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import type { IpcRenderer } from 'electron'
import { createStartupBridge } from '../../src/startup/create-startup-bridge'
import { startupIpcChannels } from '../../src/startup/startup-ipc-channels'
import type { StartupState } from '../../src/startup/types/startup-state'

class IpcRendererMock extends EventEmitter {
  invocations: string[] = []

  invoke(channel: string): Promise<unknown> {
    this.invocations.push(channel)

    if (channel === startupIpcChannels.getState) {
      return Promise.resolve({ status: 'starting', phase: 'initial' })
    }

    if (channel === startupIpcChannels.openBackendLog) {
      return Promise.resolve('opened')
    }

    return Promise.resolve()
  }

  removeListener(
    eventName: string | symbol,
    listener: (...args: unknown[]) => void
  ): this {
    return super.removeListener(eventName, listener)
  }
}

test('proxies startup actions through the narrow IPC contract', async () => {
  const ipcRenderer = new IpcRendererMock()
  const bridge = createStartupBridge(
    ipcRenderer as unknown as Pick<
      IpcRenderer,
      'invoke' | 'on' | 'removeListener'
    >
  )

  assert.deepEqual(await bridge.getState(), {
    status: 'starting',
    phase: 'initial',
  })
  assert.equal(await bridge.openBackendLog(), 'opened')
  await bridge.retry()
  await bridge.exit()

  assert.deepEqual(ipcRenderer.invocations, [
    startupIpcChannels.getState,
    startupIpcChannels.openBackendLog,
    startupIpcChannels.retry,
    startupIpcChannels.exit,
  ])
})

test('subscribes and unsubscribes startup state listeners', () => {
  const ipcRenderer = new IpcRendererMock()
  const bridge = createStartupBridge(
    ipcRenderer as unknown as Pick<
      IpcRenderer,
      'invoke' | 'on' | 'removeListener'
    >
  )
  const receivedStates: StartupState[] = []
  const unsubscribe = bridge.subscribe((state) => receivedStates.push(state))

  ipcRenderer.emit(
    startupIpcChannels.stateChanged,
    {},
    { status: 'starting', phase: 'taking-longer' }
  )
  unsubscribe()
  ipcRenderer.emit(startupIpcChannels.stateChanged, {}, { status: 'ready' })

  assert.deepEqual(receivedStates, [
    { status: 'starting', phase: 'taking-longer' },
  ])
})
