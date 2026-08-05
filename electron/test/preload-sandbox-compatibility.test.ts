import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type { NoteStackOAuthBridge } from '../src/auth/types/notestack-oauth-bridge'
import type { NoteStackDeveloperToolsBridge } from '../src/developer-tools/types/notestack-developer-tools-bridge'
import { OAuthProviderEnum } from '../src/auth/types/oauth-provider-enum'
import type { NoteStackStartupBridge } from '../src/startup/types/notestack-startup-bridge'
import type { NoteStackUpdaterBridge } from '../src/updater/updater-contract'
import type { NoteStackWindowControlsBridge } from '../src/window-controls/types/notestack-window-controls-bridge'

class IpcRendererMock extends EventEmitter {
  invocations: string[] = []

  invoke(channel: string): Promise<unknown> {
    this.invocations.push(channel)

    if (channel === 'developer-tools:get-preferences') {
      return Promise.resolve({ enabled: false })
    }

    if (channel === 'oauth:get-state') {
      return Promise.resolve({
        account: null,
        errorCode: null,
        provider: null,
        status: 'disconnected',
      })
    }

    if (channel === 'startup:get-state') {
      return Promise.resolve({ status: 'starting', phase: 'initial' })
    }

    if (channel === 'startup:open-backend-log') {
      return Promise.resolve('opened')
    }

    if (channel === 'window-controls:get-state') {
      return Promise.resolve({ isMaximized: false })
    }

    return Promise.resolve()
  }
}

test('sandboxed preload exposes narrow bridges without local runtime imports', async () => {
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const preloadPath = path.resolve(dirname, '../src/preload.cts')
  const source = readFileSync(preloadPath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const exposed = new Map<string, unknown>()
  const ipcRenderer = new IpcRendererMock()

  runInNewContext(output, {
    exports: {},
    module: { exports: {} },
    require: (moduleId: string) => {
      assert.equal(moduleId, 'electron')

      return {
        contextBridge: {
          exposeInMainWorld: (key: string, value: unknown) => {
            exposed.set(key, value)
          },
        },
        ipcRenderer,
      }
    },
  })

  const developerToolsBridge = exposed.get(
    'noteStackDeveloperTools'
  ) as NoteStackDeveloperToolsBridge
  const oauthBridge = exposed.get('noteStackOAuth') as NoteStackOAuthBridge
  const startupBridge = exposed.get(
    'noteStackStartup'
  ) as NoteStackStartupBridge
  const updaterBridge = exposed.get(
    'noteStackUpdater'
  ) as NoteStackUpdaterBridge
  const windowControlsBridge = exposed.get(
    'noteStackWindowControls'
  ) as NoteStackWindowControlsBridge

  assert.ok(developerToolsBridge)
  assert.ok(oauthBridge)
  assert.ok(startupBridge)
  assert.ok(updaterBridge)
  assert.ok(windowControlsBridge)
  assert.deepEqual(await developerToolsBridge.getPreferences(), {
    enabled: false,
  })
  await developerToolsBridge.setEnabled(true)
  await developerToolsBridge.openDeveloperTools()
  assert.deepEqual(await oauthBridge.getState(), {
    account: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  })
  await oauthBridge.connect({ provider: OAuthProviderEnum.GoogleDrive })
  await oauthBridge.reconnect({ provider: OAuthProviderEnum.OneDrive })
  await oauthBridge.disconnect(OAuthProviderEnum.GoogleDrive)
  await oauthBridge.cancel()
  assert.deepEqual(await startupBridge.getState(), {
    status: 'starting',
    phase: 'initial',
  })
  assert.equal(await startupBridge.openBackendLog(), 'opened')
  await startupBridge.retry()
  await startupBridge.exit()

  const receivedStates: unknown[] = []
  const unsubscribe = startupBridge.subscribe((state) => {
    receivedStates.push(state)
  })

  ipcRenderer.emit(
    'startup:state-changed',
    {},
    { status: 'starting', phase: 'taking-longer' }
  )
  unsubscribe()
  ipcRenderer.emit('startup:state-changed', {}, { status: 'ready' })

  assert.deepEqual(receivedStates, [
    { status: 'starting', phase: 'taking-longer' },
  ])
  await updaterBridge.getPreferences()
  await updaterBridge.getState()
  await updaterBridge.checkForUpdates()
  await updaterBridge.downloadUpdate()
  await updaterBridge.installUpdate()
  await updaterBridge.setAllowPrerelease(true)

  assert.deepEqual(await windowControlsBridge.getState(), {
    isMaximized: false,
  })
  await windowControlsBridge.minimize()
  await windowControlsBridge.toggleMaximize()
  await windowControlsBridge.close()

  const receivedWindowStates: unknown[] = []
  const unsubscribeWindowControls = windowControlsBridge.subscribe((state) => {
    receivedWindowStates.push(state)
  })

  ipcRenderer.emit('window-controls:state-changed', {}, { isMaximized: true })
  unsubscribeWindowControls()
  ipcRenderer.emit('window-controls:state-changed', {}, { isMaximized: false })

  assert.deepEqual(receivedWindowStates, [{ isMaximized: true }])
  assert.deepEqual(ipcRenderer.invocations, [
    'developer-tools:get-preferences',
    'developer-tools:set-enabled',
    'developer-tools:open',
    'oauth:get-state',
    'oauth:connect',
    'oauth:reconnect',
    'oauth:disconnect',
    'oauth:cancel',
    'startup:get-state',
    'startup:open-backend-log',
    'startup:retry',
    'startup:exit',
    'updater:get-preferences',
    'updater:get-state',
    'updater:check-for-updates',
    'updater:download-update',
    'updater:install-update',
    'updater:set-allow-prerelease',
    'window-controls:get-state',
    'window-controls:minimize',
    'window-controls:toggle-maximize',
    'window-controls:close',
  ])
  assert.doesNotMatch(output, /require\(["']\.\//)
})
