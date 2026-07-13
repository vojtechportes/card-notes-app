export interface UpdaterRelease {
  releaseDate: string | null
  releaseName: string | null
  version: string
}

export interface UpdaterDownloadProgress {
  bytesPerSecond: number
  percent: number
  total: number
  transferred: number
}

export type UpdaterState =
  | {
      currentVersion: string
      kind: 'unavailable'
      reason: 'updater-disabled'
    }
  | {
      currentVersion: string
      kind: 'idle'
    }
  | {
      currentVersion: string
      kind: 'checking'
    }
  | {
      currentVersion: string
      kind: 'available'
      update: UpdaterRelease
    }
  | {
      currentVersion: string
      kind: 'downloading'
      progress: UpdaterDownloadProgress
      update: UpdaterRelease
    }
  | {
      currentVersion: string
      kind: 'downloaded'
      update: UpdaterRelease
    }
  | {
      currentVersion: string
      kind: 'installing'
      update: UpdaterRelease
    }
  | {
      currentVersion: string
      kind: 'error'
      message: string
      update: UpdaterRelease | null
    }

export type UpdaterActionReason =
  | 'check-in-progress'
  | 'download-in-progress'
  | 'download-not-ready'
  | 'install-not-ready'
  | 'update-already-downloaded'
  | 'updater-disabled'

export interface UpdaterActionResult {
  accepted: boolean
  reason: UpdaterActionReason | null
  state: UpdaterState
}

export type UpdaterStateListener = (state: UpdaterState) => void

export interface NoteStackUpdaterBridge {
  checkForUpdates: () => Promise<UpdaterActionResult>
  downloadUpdate: () => Promise<UpdaterActionResult>
  getState: () => Promise<UpdaterState>
  installUpdate: () => Promise<UpdaterActionResult>
  subscribe: (listener: UpdaterStateListener) => () => void
}
