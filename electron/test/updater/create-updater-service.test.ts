import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import {
  createUpdaterService,
  type UpdaterClient,
} from '../../src/updater/create-updater-service'
import type { UpdaterState } from '../../src/updater/updater-contract'

class FakeUpdaterClient extends EventEmitter implements UpdaterClient {
  allowPrerelease = false
  autoDownload = true
  autoInstallOnAppQuit = true
  autoRunAppAfterInstall = true
  checkForUpdatesHandler: () => Promise<unknown> = async () => undefined
  downloadUpdateHandler: () => Promise<unknown> = async () => undefined
  quitAndInstallCalls = 0

  checkForUpdates(): Promise<unknown> {
    return this.checkForUpdatesHandler()
  }

  downloadUpdate(): Promise<unknown> {
    return this.downloadUpdateHandler()
  }

  override on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener)
  }

  quitAndInstall(): void {
    this.quitAndInstallCalls += 1
  }
}

test('returns an unavailable state when updater support is disabled', async () => {
  const client = new FakeUpdaterClient()
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: false,
    persistAllowPrerelease: () => undefined,
  })

  assert.deepEqual(updaterService.getState(), {
    currentVersion: '1.0.3',
    kind: 'unavailable',
    reason: 'updater-disabled',
  })

  const result = await updaterService.checkForUpdates()

  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'updater-disabled')
  assert.equal(client.autoDownload, false)
  assert.equal(client.autoInstallOnAppQuit, false)
  assert.equal(client.autoRunAppAfterInstall, false)
})

test('tracks manual check, download, and install transitions', async () => {
  const client = new FakeUpdaterClient()
  const states: UpdaterState[] = []
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: true,
    persistAllowPrerelease: () => undefined,
    onStateChange: (state) => {
      states.push(state)
    },
  })

  client.checkForUpdatesHandler = async () => {
    client.emit('checking-for-update')
    client.emit('update-available', {
      releaseDate: '2026-07-10T08:00:00.000Z',
      releaseName: 'NoteStack 1.1.0',
      version: '1.1.0',
    })
  }

  client.downloadUpdateHandler = async () => {
    client.emit('download-progress', {
      bytesPerSecond: 1024,
      percent: 50,
      total: 200,
      transferred: 100,
    })
    client.emit('update-downloaded', {
      releaseDate: '2026-07-10T08:00:00.000Z',
      releaseName: 'NoteStack 1.1.0',
      version: '1.1.0',
    })
  }

  const checkResult = await updaterService.checkForUpdates()

  assert.equal(checkResult.accepted, true)
  assert.deepEqual(updaterService.getState(), {
    currentVersion: '1.0.3',
    kind: 'available',
    update: {
      releaseDate: '2026-07-10T08:00:00.000Z',
      releaseName: 'NoteStack 1.1.0',
      version: '1.1.0',
    },
  })

  const downloadResult = await updaterService.downloadUpdate()

  assert.equal(downloadResult.accepted, true)
  assert.deepEqual(updaterService.getState(), {
    currentVersion: '1.0.3',
    kind: 'downloaded',
    update: {
      releaseDate: '2026-07-10T08:00:00.000Z',
      releaseName: 'NoteStack 1.1.0',
      version: '1.1.0',
    },
  })

  const installResult = await updaterService.installUpdate()

  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

  assert.equal(installResult.accepted, true)
  assert.equal(client.quitAndInstallCalls, 1)
  assert.deepEqual(states, [
    {
      currentVersion: '1.0.3',
      kind: 'checking',
    },
    {
      currentVersion: '1.0.3',
      kind: 'checking',
    },
    {
      currentVersion: '1.0.3',
      kind: 'available',
      update: {
        releaseDate: '2026-07-10T08:00:00.000Z',
        releaseName: 'NoteStack 1.1.0',
        version: '1.1.0',
      },
    },
    {
      currentVersion: '1.0.3',
      kind: 'downloading',
      progress: {
        bytesPerSecond: 1024,
        percent: 50,
        total: 200,
        transferred: 100,
      },
      update: {
        releaseDate: '2026-07-10T08:00:00.000Z',
        releaseName: 'NoteStack 1.1.0',
        version: '1.1.0',
      },
    },
    {
      currentVersion: '1.0.3',
      kind: 'downloaded',
      update: {
        releaseDate: '2026-07-10T08:00:00.000Z',
        releaseName: 'NoteStack 1.1.0',
        version: '1.1.0',
      },
    },
    {
      currentVersion: '1.0.3',
      kind: 'installing',
      update: {
        releaseDate: '2026-07-10T08:00:00.000Z',
        releaseName: 'NoteStack 1.1.0',
        version: '1.1.0',
      },
    },
  ])
})

test('guards overlapping updater commands before electron-updater emits later events', async () => {
  const client = new FakeUpdaterClient()
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: true,
    persistAllowPrerelease: () => undefined,
  })

  let resolveCheck: (() => void) | null = null

  client.checkForUpdatesHandler = () => {
    client.emit('checking-for-update')

    return new Promise((resolve) => {
      resolveCheck = () => {
        client.emit('update-available', {
          releaseDate: '2026-07-10T08:00:00.000Z',
          releaseName: 'NoteStack 1.1.0',
          version: '1.1.0',
        })
        resolve(undefined)
      }
    })
  }

  const firstCheckPromise = updaterService.checkForUpdates()
  const secondCheckResult = await updaterService.checkForUpdates()

  assert.equal(secondCheckResult.accepted, false)
  assert.equal(secondCheckResult.reason, 'check-in-progress')

  resolveCheck?.()
  await firstCheckPromise

  let resolveDownload: (() => void) | null = null

  client.downloadUpdateHandler = () => {
    return new Promise((resolve) => {
      resolveDownload = () => {
        client.emit('update-downloaded', {
          releaseDate: '2026-07-10T08:00:00.000Z',
          releaseName: 'NoteStack 1.1.0',
          version: '1.1.0',
        })
        resolve(undefined)
      }
    })
  }

  const firstDownloadPromise = updaterService.downloadUpdate()
  const secondDownloadResult = await updaterService.downloadUpdate()

  assert.equal(secondDownloadResult.accepted, false)
  assert.equal(secondDownloadResult.reason, 'download-in-progress')

  resolveDownload?.()
  await firstDownloadPromise
})

test('keeps silent updater failures quiet while preserving the prior state', async () => {
  const client = new FakeUpdaterClient()
  const states: UpdaterState[] = []
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: true,
    persistAllowPrerelease: () => undefined,
    onStateChange: (state) => {
      states.push(state)
    },
  })

  client.checkForUpdatesHandler = async () => {
    throw new Error('Feed is unavailable.')
  }

  const result = await updaterService.checkForUpdatesSilently()

  assert.equal(result.accepted, false)
  assert.equal(result.reason, null)
  assert.deepEqual(updaterService.getState(), {
    currentVersion: '1.0.3',
    kind: 'idle',
  })
  assert.deepEqual(states, [])
})

test('ignores silent updater error events without surfacing an error state', async () => {
  const client = new FakeUpdaterClient()
  const states: UpdaterState[] = []
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: true,
    persistAllowPrerelease: () => undefined,
    onStateChange: (state) => {
      states.push(state)
    },
  })

  client.checkForUpdatesHandler = async () => {
    client.emit('error', new Error('Feed is unavailable.'))
  }

  const result = await updaterService.checkForUpdatesSilently()

  assert.equal(result.accepted, true)
  assert.equal(result.reason, null)
  assert.deepEqual(updaterService.getState(), {
    currentVersion: '1.0.3',
    kind: 'idle',
  })
  assert.deepEqual(states, [])
})

test('guards invalid commands and captures updater errors', async () => {
  const client = new FakeUpdaterClient()
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: true,
    persistAllowPrerelease: () => undefined,
  })

  const downloadBeforeCheck = await updaterService.downloadUpdate()
  const installBeforeDownload = await updaterService.installUpdate()

  assert.equal(downloadBeforeCheck.accepted, false)
  assert.equal(downloadBeforeCheck.reason, 'download-not-ready')
  assert.equal(installBeforeDownload.accepted, false)
  assert.equal(installBeforeDownload.reason, 'install-not-ready')

  client.checkForUpdatesHandler = async () => {
    throw new Error('Feed is unavailable.')
  }

  const failedCheck = await updaterService.checkForUpdates()

  assert.equal(failedCheck.accepted, false)
  assert.equal(failedCheck.reason, null)
  assert.deepEqual(updaterService.getState(), {
    currentVersion: '1.0.3',
    kind: 'error',
    message: 'Feed is unavailable.',
    update: null,
  })
})
test('loads and persists the prerelease preference before checking for updates', async () => {
  const client = new FakeUpdaterClient()
  const persistedValues: boolean[] = []
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: true,
    isEnabled: true,
    persistAllowPrerelease: (allowPrerelease) => {
      persistedValues.push(allowPrerelease)
    },
  })

  assert.equal(client.allowPrerelease, true)
  assert.deepEqual(updaterService.getPreferences(), { allowPrerelease: true })

  client.checkForUpdatesHandler = async () => {
    client.emit('update-not-available')
  }

  const preferences = await updaterService.setAllowPrerelease(false)

  assert.equal(client.allowPrerelease, false)
  assert.deepEqual(preferences, { allowPrerelease: false })
  assert.deepEqual(persistedValues, [false])
})

test('queues the preference refresh behind an active update check', async () => {
  const client = new FakeUpdaterClient()
  const updaterService = createUpdaterService({
    client,
    currentVersion: '1.0.3',
    initialAllowPrerelease: false,
    isEnabled: true,
    persistAllowPrerelease: () => undefined,
  })
  const resolvers: Array<() => void> = []
  let activeChecks = 0
  let maximumActiveChecks = 0

  client.checkForUpdatesHandler = () => {
    activeChecks += 1
    maximumActiveChecks = Math.max(maximumActiveChecks, activeChecks)

    return new Promise((resolve) => {
      resolvers.push(() => {
        activeChecks -= 1
        client.emit('update-not-available')
        resolve(undefined)
      })
    })
  }

  const initialCheck = updaterService.checkForUpdates()
  const preferenceChange = updaterService.setAllowPrerelease(true)

  assert.equal(resolvers.length, 1)
  resolvers.shift()?.()
  await initialCheck

  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

  assert.equal(resolvers.length, 1)
  resolvers.shift()?.()
  await preferenceChange

  assert.equal(maximumActiveChecks, 1)
  assert.equal(client.allowPrerelease, true)
})
