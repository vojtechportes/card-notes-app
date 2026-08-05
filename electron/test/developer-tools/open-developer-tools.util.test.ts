import assert from 'node:assert/strict'
import test from 'node:test'
import { openDeveloperTools } from '../../src/developer-tools/utils/open-developer-tools.util'

const createWindow = (destroyed = false) => {
  const calls: Array<{ mode: 'detach' }> = []

  return {
    calls,
    window: {
      isDestroyed: () => destroyed,
      webContents: {
        openDevTools: (options: { mode: 'detach' }) => {
          calls.push(options)
        },
      },
    },
  }
}

test('developer tools cannot open while the persisted preference is disabled', () => {
  const target = createWindow()

  assert.throws(
    () => openDeveloperTools(target.window, { enabled: false }),
    /developer-tools-disabled/
  )
  assert.deepEqual(target.calls, [])
})

test('developer tools open detached for the invoking window when enabled', () => {
  const target = createWindow()

  openDeveloperTools(target.window, { enabled: true })

  assert.deepEqual(target.calls, [{ mode: 'detach' }])
})

test('developer tools reject missing or destroyed invoking windows', () => {
  assert.throws(
    () => openDeveloperTools(null, { enabled: true }),
    /developer-tools-window-unavailable/
  )
  assert.throws(
    () => openDeveloperTools(createWindow(true).window, { enabled: true }),
    /developer-tools-window-unavailable/
  )
})
