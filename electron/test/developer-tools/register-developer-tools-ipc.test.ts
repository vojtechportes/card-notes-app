import assert from 'node:assert/strict'
import test from 'node:test'
import { developerToolsIpcChannels } from '../../src/developer-tools/developer-tools-ipc-channels'
import { registerDeveloperToolsIpc } from '../../src/developer-tools/register-developer-tools-ipc'
import type {
  DeveloperToolsIpcDependencies,
  DeveloperToolsIpcHandler,
} from '../../src/developer-tools/types/developer-tools-ipc'

test('developer tools IPC uses the invoking sender and current persisted preference', () => {
  const handlers = new Map<string, DeveloperToolsIpcHandler>()
  const sender = { id: 'renderer' }
  const resolvedSenders: unknown[] = []
  const openedWith: Array<{ mode: 'detach' }> = []
  let enabled = false
  let preferenceReads = 0

  const preferencesStore = {
    getPreferences: () => {
      preferenceReads += 1
      return { enabled }
    },
    setEnabled: (nextEnabled: boolean) => {
      enabled = nextEnabled
      return { enabled }
    },
  }
  const dependencies: DeveloperToolsIpcDependencies = {
    getInvokingWindow: (invokingSender) => {
      resolvedSenders.push(invokingSender)

      return {
        isDestroyed: () => false,
        webContents: {
          openDevTools: (options) => {
            openedWith.push(options)
          },
        },
      }
    },
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      },
    },
    openBackendLog: () => Promise.resolve('opened'),
  }

  registerDeveloperToolsIpc(preferencesStore, dependencies)

  assert.deepEqual(
    handlers.get(developerToolsIpcChannels.getPreferences)?.({ sender }),
    { enabled: false }
  )
  assert.throws(
    () => handlers.get(developerToolsIpcChannels.open)?.({ sender }),
    /developer-tools-disabled/
  )
  assert.deepEqual(resolvedSenders, [sender])
  assert.deepEqual(openedWith, [])

  assert.deepEqual(
    handlers.get(developerToolsIpcChannels.setEnabled)?.({ sender }, true),
    { enabled: true }
  )
  handlers.get(developerToolsIpcChannels.open)?.({ sender })

  assert.deepEqual(resolvedSenders, [sender, sender])
  assert.deepEqual(openedWith, [{ mode: 'detach' }])
  assert.equal(preferenceReads, 3)
})

test('developer tools IPC only opens the backend log while enabled', async () => {
  const handlers = new Map<string, DeveloperToolsIpcHandler>()
  let enabled = false
  let openBackendLogCalls = 0
  const preferencesStore = {
    getPreferences: () => ({ enabled }),
    setEnabled: (nextEnabled: boolean) => {
      enabled = nextEnabled

      return { enabled }
    },
  }

  registerDeveloperToolsIpc(preferencesStore, {
    getInvokingWindow: () => null,
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      },
    },
    openBackendLog: () => {
      openBackendLogCalls += 1

      return Promise.resolve('opened')
    },
  })

  assert.throws(
    () =>
      handlers.get(developerToolsIpcChannels.openBackendLog)?.({ sender: {} }),
    /developer-tools-disabled/
  )
  assert.equal(openBackendLogCalls, 0)

  handlers.get(developerToolsIpcChannels.setEnabled)?.({ sender: {} }, true)

  assert.equal(
    await handlers.get(developerToolsIpcChannels.openBackendLog)?.({
      sender: {},
    }),
    'opened'
  )
  assert.equal(openBackendLogCalls, 1)
})

test('developer tools IPC rejects non-boolean preference payloads', () => {
  const handlers = new Map<string, DeveloperToolsIpcHandler>()
  const preferencesStore = {
    getPreferences: () => ({ enabled: false }),
    setEnabled: (enabled: boolean) => ({ enabled }),
  }

  registerDeveloperToolsIpc(preferencesStore, {
    getInvokingWindow: () => null,
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      },
    },
    openBackendLog: () => Promise.resolve('opened'),
  })

  for (const value of [undefined, null, 1, 'true', {}]) {
    assert.throws(
      () =>
        handlers.get(developerToolsIpcChannels.setEnabled)?.(
          { sender: {} },
          value
        ),
      /developer-tools-invalid-preference/
    )
  }
})
