import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type { NoteStackStartupBridge } from '../src/startup/types/notestack-startup-bridge'
import type { NoteStackUpdaterBridge } from '../src/updater/updater-contract'

class IpcRendererMock extends EventEmitter {
  invocations: string[] = []

  invoke(channel: string): Promise<unknown> {
    this.invocations.push(channel)

    if (channel === 'startup:get-state') {
      return Promise.resolve({ status: 'starting', phase: 'initial' })
    }

    if (channel === 'startup:open-backend-log') {
      return Promise.resolve('opened')
    }

    return Promise.resolve()
  }
}

test('sandboxed preload exposes both bridges without local runtime imports', async () => {
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

  const startupBridge = exposed.get(
    'noteStackStartup'
  ) as NoteStackStartupBridge
  const updaterBridge = exposed.get(
    'noteStackUpdater'
  ) as NoteStackUpdaterBridge

  assert.ok(startupBridge)
  assert.ok(updaterBridge)
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
  assert.deepEqual(ipcRenderer.invocations, [
    'startup:get-state',
    'startup:open-backend-log',
    'startup:retry',
    'startup:exit',
  ])
  assert.doesNotMatch(output, /require\(["']\.\//)
})
