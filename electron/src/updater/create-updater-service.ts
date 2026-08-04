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
import type { UpdaterPreferences } from './types/updater-preferences.js'

export interface UpdaterClient {
  allowPrerelease: boolean
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  autoRunAppAfterInstall: boolean
  checkForUpdates: () => Promise<unknown>
  downloadUpdate: () => Promise<unknown>
  on(event: 'checking-for-update', listener: () => void): UpdaterClient
  on(
    event: 'update-available',
    listener: (updateInfo: UpdateInfo) => void
  ): UpdaterClient
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
  checkForUpdatesSilently: () => Promise<UpdaterActionResult>
  downloadUpdate: () => Promise<UpdaterActionResult>
  getPreferences: () => UpdaterPreferences
  getState: () => UpdaterState
  installUpdate: () => Promise<UpdaterActionResult>
  setAllowPrerelease: (allowPrerelease: boolean) => Promise<UpdaterPreferences>
}

interface CreateUpdaterServiceOptions {
  client: UpdaterClient
  currentVersion: string
  initialAllowPrerelease: boolean
  isEnabled: boolean
  onStateChange?: (state: UpdaterState) => void
  persistAllowPrerelease: (allowPrerelease: boolean) => Promise<void> | void
}

type CheckMode = 'manual' | 'silent' | null

export const createUpdaterService = ({
  client,
  currentVersion,
  initialAllowPrerelease,
  isEnabled,
  onStateChange,
  persistAllowPrerelease,
}: CreateUpdaterServiceOptions): UpdaterService => {
  client.allowPrerelease = initialAllowPrerelease
  client.autoDownload = false
  client.autoInstallOnAppQuit = false
  client.autoRunAppAfterInstall = false

  let activeCheckMode: CheckMode = null
  let activeCheckPromise: Promise<UpdaterActionResult> | null = null
  let allowPrerelease = initialAllowPrerelease
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

  const finalizeCheck = (): void => {
    isCheckingForUpdates = false
    activeCheckMode = null
  }

  const setErrorState = (error: unknown): UpdaterActionResult => {
    finalizeCheck()
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

  const executeCheckForUpdates = async (
    checkMode: Exclude<CheckMode, null>
  ): Promise<UpdaterActionResult> => {
    isCheckingForUpdates = true
    activeCheckMode = checkMode

    if (checkMode === 'manual') {
      setState({
        currentVersion,
        kind: 'checking',
      })
    }

    try {
      await client.checkForUpdates()
      return acceptAction()
    } catch (error) {
      if (checkMode === 'silent') {
        finalizeCheck()

        return {
          accepted: false,
          reason: null,
          state,
        }
      }

      return setErrorState(error)
    }
  }

  const runCheckForUpdates = async (
    checkMode: Exclude<CheckMode, null>
  ): Promise<UpdaterActionResult> => {
    if (!isEnabled) {
      return rejectAction('updater-disabled')
    }

    if (activeCheckPromise || isCheckingForUpdates) {
      return rejectAction('check-in-progress')
    }

    const checkPromise = executeCheckForUpdates(checkMode)

    activeCheckPromise = checkPromise

    try {
      return await checkPromise
    } finally {
      if (activeCheckPromise === checkPromise) {
        activeCheckPromise = null
      }
    }
  }

  const refreshAfterPreferenceChange = async (): Promise<void> => {
    const pendingCheck = activeCheckPromise

    if (pendingCheck) {
      await pendingCheck
    }

    if (
      !isEnabled ||
      isDownloadingUpdate ||
      state.kind === 'downloaded' ||
      state.kind === 'installing'
    ) {
      return
    }

    await runCheckForUpdates('manual')
  }

  if (isEnabled) {
    client.on('checking-for-update', () => {
      if (activeCheckMode !== 'manual') {
        return
      }

      setState({
        currentVersion,
        kind: 'checking',
      })
    })

    client.on('update-available', (updateInfo) => {
      finalizeCheck()
      lastKnownUpdate = mapUpdateInfo(updateInfo)
      setState({
        currentVersion,
        kind: 'available',
        update: lastKnownUpdate,
      })
    })

    client.on('update-not-available', () => {
      finalizeCheck()
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
      if (activeCheckMode === 'silent') {
        finalizeCheck()
        return
      }

      setErrorState(error)
    })
  }

  return {
    getPreferences: () => ({ allowPrerelease }),
    getState: () => state,
    checkForUpdates: async () => {
      return runCheckForUpdates('manual')
    },
    checkForUpdatesSilently: async () => {
      return runCheckForUpdates('silent')
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
    setAllowPrerelease: async (nextAllowPrerelease) => {
      if (nextAllowPrerelease === allowPrerelease) {
        return { allowPrerelease }
      }

      await persistAllowPrerelease(nextAllowPrerelease)
      allowPrerelease = nextAllowPrerelease
      client.allowPrerelease = nextAllowPrerelease

      await refreshAfterPreferenceChange()

      return { allowPrerelease }
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
  updateInfo: Pick<
    UpdateDownloadedEvent,
    'releaseDate' | 'releaseName' | 'version'
  >
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

const normalizeReleaseDate = (
  releaseDate?: Date | string | null
): string | null => {
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
