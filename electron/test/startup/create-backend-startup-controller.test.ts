import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import type { ChildProcess } from 'node:child_process'
import { BackendEntrypointMissingError } from '../../src/startup/backend-entrypoint-missing-error'
import { createBackendStartupController } from '../../src/startup/create-backend-startup-controller'
import type { StartupState } from '../../src/startup/types/startup-state'

class ChildProcessMock extends EventEmitter {
  exitCode: number | null = null
  killCalled = false
  pid: number
  signalCode: NodeJS.Signals | null = null

  constructor(
    pid: number,
    private readonly killResult = true,
    private readonly emitExitOnKill = true
  ) {
    super()
    this.pid = pid
  }

  kill(): boolean {
    this.killCalled = true

    if (!this.killResult) {
      return false
    }

    if (this.emitExitOnKill) {
      this.signalCode = 'SIGTERM'
      queueMicrotask(() => this.emit('exit', null, 'SIGTERM'))
    }

    return true
  }
}

test('reuses an already healthy backend without taking ownership', async () => {
  let spawnCount = 0
  const states: StartupState[] = []
  const controller = createBackendStartupController({
    emitState: (state) => states.push(state),
    isHealthy: async () => true,
    log: () => undefined,
    pollIntervalMs: 1,
    softThresholdMs: 5,
    spawnBackend: () => {
      spawnCount += 1
      return new ChildProcessMock(1) as unknown as ChildProcess
    },
  })

  controller.start()
  await new Promise((resolve) => setImmediate(resolve))
  controller.dispose()

  assert.equal(spawnCount, 0)
  assert.deepEqual(states.at(-1), { status: 'ready' })
})

test('continues polling after the soft threshold and eventually becomes ready', async () => {
  let healthChecks = 0
  let resolveReady: (() => void) | undefined
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  const states: StartupState[] = []
  const controller = createBackendStartupController({
    emitState: (state) => {
      states.push(state)

      if (state.status === 'ready') {
        resolveReady?.()
      }
    },
    isHealthy: async () => {
      healthChecks += 1
      return healthChecks >= 3
    },
    log: () => undefined,
    pollIntervalMs: 1,
    softThresholdMs: 0,
    spawnBackend: () => new ChildProcessMock(2) as unknown as ChildProcess,
  })

  controller.start()
  await ready
  controller.dispose()

  assert.ok(
    states.some(
      (state) => state.status === 'starting' && state.phase === 'taking-longer'
    )
  )
  assert.deepEqual(states.at(-1), { status: 'ready' })
})

test('reports a missing entrypoint as a recoverable failure', async () => {
  let resolveFailure: ((state: StartupState) => void) | undefined
  const failure = new Promise<StartupState>((resolve) => {
    resolveFailure = resolve
  })
  const controller = createBackendStartupController({
    emitState: (state) => {
      if (state.status === 'failed') {
        resolveFailure?.(state)
      }
    },
    isHealthy: async () => false,
    log: () => undefined,
    pollIntervalMs: 1,
    softThresholdMs: 5,
    spawnBackend: () => {
      throw new BackendEntrypointMissingError('Entrypoint missing')
    },
  })

  controller.start()

  assert.deepEqual(await failure, {
    status: 'failed',
    reason: 'entrypoint-missing',
  })
  controller.dispose()
})

test('reports spawn errors and pre-readiness exits with distinct reasons', async (context) => {
  await context.test('spawn error', async () => {
    const child = new ChildProcessMock(3)
    let resolveFailure: ((state: StartupState) => void) | undefined
    const failure = new Promise<StartupState>((resolve) => {
      resolveFailure = resolve
    })
    const controller = createBackendStartupController({
      emitState: (state) => {
        if (state.status === 'failed') {
          resolveFailure?.(state)
        }
      },
      isHealthy: async () => false,
      log: () => undefined,
      pollIntervalMs: 5,
      softThresholdMs: 50,
      spawnBackend: () => child as unknown as ChildProcess,
    })

    controller.start()
    await new Promise((resolve) => setImmediate(resolve))
    child.emit('error', new Error('Spawn failed'))

    assert.deepEqual(await failure, {
      status: 'failed',
      reason: 'spawn-error',
    })
    controller.dispose()
  })

  await context.test('process exit', async () => {
    const child = new ChildProcessMock(4)
    let resolveFailure: ((state: StartupState) => void) | undefined
    const failure = new Promise<StartupState>((resolve) => {
      resolveFailure = resolve
    })
    const controller = createBackendStartupController({
      emitState: (state) => {
        if (state.status === 'failed') {
          resolveFailure?.(state)
        }
      },
      isHealthy: async () => false,
      log: () => undefined,
      pollIntervalMs: 5,
      softThresholdMs: 50,
      spawnBackend: () => child as unknown as ChildProcess,
    })

    controller.start()
    await new Promise((resolve) => setImmediate(resolve))
    child.exitCode = 1
    child.emit('exit', 1, null)

    assert.deepEqual(await failure, {
      status: 'failed',
      reason: 'process-exited',
    })
    controller.dispose()
  })
})

test('retry cancels its owned child and ignores stale health results', async () => {
  const firstChild = new ChildProcessMock(5)
  let healthCheck = 0
  let resolveOldHealth: ((healthy: boolean) => void) | undefined
  let resolveReady: (() => void) | undefined
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  const states: StartupState[] = []
  const controller = createBackendStartupController({
    emitState: (state) => {
      states.push(state)

      if (state.status === 'ready') {
        resolveReady?.()
      }
    },
    isHealthy: async () => {
      healthCheck += 1

      if (healthCheck === 1) {
        return false
      }

      if (healthCheck === 2) {
        return new Promise<boolean>((resolve) => {
          resolveOldHealth = resolve
        })
      }

      return true
    },
    log: () => undefined,
    pollIntervalMs: 1,
    softThresholdMs: 50,
    spawnBackend: () => firstChild as unknown as ChildProcess,
  })

  controller.start()
  await new Promise((resolve) => setImmediate(resolve))
  await controller.retry()
  await ready

  resolveOldHealth?.(true)
  firstChild.emit('exit', 0, null)
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(firstChild.killCalled, true)
  assert.deepEqual(states.at(-1), { status: 'ready' })
  controller.dispose()
})

test('concurrent retry requests create one replacement attempt', async () => {
  const children = [new ChildProcessMock(6), new ChildProcessMock(7)]
  let spawnCount = 0
  const controller = createBackendStartupController({
    emitState: () => undefined,
    isHealthy: async () => false,
    log: () => undefined,
    pollIntervalMs: 10,
    softThresholdMs: 50,
    spawnBackend: () => {
      const child = children[spawnCount]
      spawnCount += 1
      return child as unknown as ChildProcess
    },
  })

  controller.start()
  await new Promise((resolve) => setImmediate(resolve))
  await Promise.all([controller.retry(), controller.retry()])
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(spawnCount, 2)
  assert.equal(children[0].killCalled, true)
  controller.dispose()
})

test('shutdown terminates an owned live child', async () => {
  const child = new ChildProcessMock(8)
  const controller = createBackendStartupController({
    emitState: () => undefined,
    isHealthy: async () => false,
    log: () => undefined,
    pollIntervalMs: 10,
    softThresholdMs: 50,
    spawnBackend: () => child as unknown as ChildProcess,
  })

  controller.start()
  await new Promise((resolve) => setImmediate(resolve))
  controller.dispose()

  assert.equal(child.killCalled, true)
})
test('does not replace an owned backend when kill reports failure', async () => {
  const child = new ChildProcessMock(9, false)
  let spawnCount = 0
  const controller = createBackendStartupController({
    emitState: () => undefined,
    isHealthy: async () => false,
    log: () => undefined,
    pollIntervalMs: 10,
    softThresholdMs: 50,
    spawnBackend: () => {
      spawnCount += 1
      return child as unknown as ChildProcess
    },
    terminationTimeoutMs: 5,
  })

  controller.start()
  await new Promise((resolve) => setImmediate(resolve))
  await controller.retry()

  assert.equal(spawnCount, 1)
  assert.deepEqual(controller.getState(), {
    status: 'failed',
    reason: 'termination-failed',
  })
  controller.dispose()
})

test('bounds termination waiting and does not launch a competing backend', async () => {
  const child = new ChildProcessMock(10, true, false)
  let spawnCount = 0
  const controller = createBackendStartupController({
    emitState: () => undefined,
    isHealthy: async () => false,
    log: () => undefined,
    pollIntervalMs: 10,
    softThresholdMs: 50,
    spawnBackend: () => {
      spawnCount += 1
      return child as unknown as ChildProcess
    },
    terminationTimeoutMs: 5,
  })

  controller.start()
  await new Promise((resolve) => setImmediate(resolve))
  await controller.retry()

  assert.equal(spawnCount, 1)
  assert.deepEqual(controller.getState(), {
    status: 'failed',
    reason: 'termination-failed',
  })
  controller.dispose()
})
