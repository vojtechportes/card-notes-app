import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncQuitHandler } from '../../src/sync/utils/create-sync-quit-handler.util.js'

test('waits for one flush before resuming quit without looping', async () => {
  let completeFlush: (() => void) | null = null
  let disposeCalls = 0
  let flushCalls = 0
  let preventDefaultCalls = 0
  let quitCalls = 0
  const handler = createSyncQuitHandler({
    dispose: () => {
      disposeCalls += 1
    },
    flush: () => {
      flushCalls += 1

      return new Promise((resolve) => {
        completeFlush = resolve
      })
    },
    quit: () => {
      quitCalls += 1
    },
  })
  const event = {
    preventDefault: () => {
      preventDefaultCalls += 1
    },
  }

  handler(event)
  handler(event)

  assert.equal(flushCalls, 1)
  assert.equal(preventDefaultCalls, 2)
  assert.equal(quitCalls, 0)

  completeFlush?.()
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(disposeCalls, 1)
  assert.equal(quitCalls, 1)

  handler(event)

  assert.equal(preventDefaultCalls, 2)
  assert.equal(disposeCalls, 2)
  assert.equal(flushCalls, 1)
})
