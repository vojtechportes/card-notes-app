import type {
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'
import type {
  UpdaterActionReason,
  UpdaterActionResult,
  UpdaterDownloadProgress,
  UpdaterRelease,
  UpdaterState,
} from './updater-contract.js'

export interface UpdaterClient {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  autoRunAppAfterInstall: boolean
  checkForUpdates: () => Promise<unknown>
  downloadUpdate: () => Promise<unknown>
  on(event: 'checking-for-update', listener: () => void): UpdaterClient
  on(event: 'update-available', listener: (updateInfo: UpdateInfo) => void): UpdaterClient
  on(event: 'update-not-available', listener: () => void): UpdaterClient
  on(
    event: 'download-progress',
    listener: (progressInfo: ProgressInfo) => void
  ): UpdaterClient
  on(
    event: 'update-downloaded',
    listener: (updateInfo: UpdateDownloadedEvent) => void
  ): UpdaterClient
  on(event: 'error', listener: (error: Error) => void): UpdaterClient
  quitAndInstall: () => void
}

export interface UpdaterService {
  checkForUpdates: () => Promise<UpdaterActionResult>
  downloadUpdate: () => Promise<UpdaterActionResult>
  getState: () => UpdaterState
  installUpdate: () => Promise<UpdaterActionResult>
}

interface CreateUpdaterServiceOptions {
  client: UpdaterClient
  currentVersion: string
  isEnabled: boolean
  onStateChange?: (state: UpdaterState) => void
}

export const createUpdaterService = ({
  client,
  currentVersion,
  isEnabled,
  onStateChange,
}: CreateUpdaterServiceOptions): UpdaterService => {
  client.autoDownload = false
  client.autoInstallOnAppQuit = false
  client.autoRunAppAfterInstall = false

  let isCheckingForUpdates = false
  let isDownloadingUpdate = false
  let lastKnownUpdate: UpdaterRelease | null = null
  let state: UpdaterState = isEnabled
    ? {
        currentVersion,
        kind: 'idle',
      }
    : {
        currentVersion,
        kind: 'unavailable',
        reason: 'updater-disabled',
      }

  const setState = (nextState: UpdaterState): UpdaterState => {
    state = nextState
    onStateChange?.(state)

    return state
  }

  const rejectAction = (reason: UpdaterActionReason): UpdaterActionResult => {
    return {
      accepted: false,
      reason,
      state,
    }
  }

  const acceptAction = (): UpdaterActionResult => {
    return {
      accepted: true,
      reason: null,
      state,
    }
  }

  const setErrorState = (error: unknown): UpdaterActionResult => {
    isCheckingForUpdates = false
    isDownloadingUpdate = false

    return {
      accepted: false,
      reason: null,
      state: setState({
        currentVersion,
        kind: 'error',
        message: getErrorMessage(error),
        update: lastKnownUpdate,
      }),
    }
  }

  if (isEnabled) {
    client.on('checking-for-update', () => {
      setState({
        currentVersion,
        kind: 'checking',
      })
    })

    client.on('update-available', (updateInfo) => {
      isCheckingForUpdates = false
      lastKnownUpdate = mapUpdateInfo(updateInfo)
      setState({
        currentVersion,
        kind: 'available',
        update: lastKnownUpdate,
      })
    })

    client.on('update-not-available', () => {
      isCheckingForUpdates = false
      lastKnownUpdate = null
      setState({
        currentVersion,
        kind: 'idle',
      })
    })

    client.on('download-progress', (progressInfo) => {
      if (!lastKnownUpdate) {
        return
      }

      setState({
        currentVersion,
        kind: 'downloading',
        progress: mapProgressInfo(progressInfo),
        update: lastKnownUpdate,
      })
    })

    client.on('update-downloaded', (updateInfo) => {
      isDownloadingUpdate = false
      lastKnownUpdate = mapDownloadedUpdate(updateInfo)
      setState({
        currentVersion,
        kind: 'downloaded',
        update: lastKnownUpdate,
      })
    })

    client.on('error', (error) => {
      setErrorState(error)
    })
  }

  return {
    getState: () => state,
    checkForUpdates: async () => {
      if (!isEnabled) {
        return rejectAction('updater-disabled')
      }

      if (isCheckingForUpdates) {
        return rejectAction('check-in-progress')
      }

      isCheckingForUpdates = true
      setState({
        currentVersion,
        kind: 'checking',
      })

      try {
        await client.checkForUpdates()
        return acceptAction()
      } catch (error) {
        return setErrorState(error)
      }
    },
    downloadUpdate: async () => {
      if (!isEnabled) {
        return rejectAction('updater-disabled')
      }

      if (isDownloadingUpdate) {
        return rejectAction('download-in-progress')
      }

      if (state.kind === 'downloaded') {
        return rejectAction('update-already-downloaded')
      }

      if (state.kind !== 'available') {
        return rejectAction('download-not-ready')
      }

      isDownloadingUpdate = true

      try {
        await client.downloadUpdate()
        return acceptAction()
      } catch (error) {
        return setErrorState(error)
      }
    },
    installUpdate: async () => {
      if (!isEnabled) {
        return rejectAction('updater-disabled')
      }

      if (state.kind !== 'downloaded') {
        return rejectAction('install-not-ready')
      }

      const update = state.update

      setState({
        currentVersion,
        kind: 'installing',
        update,
      })

      queueMicrotask(() => {
        client.quitAndInstall()
      })

      return acceptAction()
    },
  }
}

const mapDownloadedUpdate = (
  updateInfo: Pick<UpdateDownloadedEvent, 'releaseDate' | 'releaseName' | 'version'>
): UpdaterRelease => {
  return mapUpdateInfo(updateInfo)
}

const mapProgressInfo = (
  progressInfo: Pick<
    ProgressInfo,
    'bytesPerSecond' | 'percent' | 'total' | 'transferred'
  >
): UpdaterDownloadProgress => {
  return {
    bytesPerSecond: progressInfo.bytesPerSecond,
    percent: progressInfo.percent,
    total: progressInfo.total,
    transferred: progressInfo.transferred,
  }
}

const mapUpdateInfo = (
  updateInfo: Pick<UpdateInfo, 'releaseDate' | 'releaseName' | 'version'>
): UpdaterRelease => {
  return {
    releaseDate: normalizeReleaseDate(updateInfo.releaseDate),
    releaseName: updateInfo.releaseName ?? null,
    version: updateInfo.version,
  }
}

const normalizeReleaseDate = (releaseDate?: Date | string | null): string | null => {
  if (!releaseDate) {
    return null
  }

  if (releaseDate instanceof Date) {
    return releaseDate.toISOString()
  }

  return releaseDate
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return 'An unknown updater error occurred.'
}
