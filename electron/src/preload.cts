import type { IpcRenderer } from 'electron'
import type { NoteStackStartupBridge } from './startup/types/notestack-startup-bridge.js'
import type { StartupState } from './startup/types/startup-state.js'
import type {
  NoteStackWindowControlsBridge,
  WindowControlsState,
} from './window-controls/types/notestack-window-controls-bridge.js'
import type {
  NoteStackUpdaterBridge,
  UpdaterState,
} from './updater/updater-contract.js'

const { contextBridge, ipcRenderer } = require('electron') as {
  contextBridge: {
    exposeInMainWorld: (apiKey: string, api: unknown) => void
  }
  ipcRenderer: Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>
}

const startupIpcChannels = {
  exit: 'startup:exit',
  getState: 'startup:get-state',
  openBackendLog: 'startup:open-backend-log',
  retry: 'startup:retry',
  stateChanged: 'startup:state-changed',
} as const

const updaterIpcChannels = {
  checkForUpdates: 'updater:check-for-updates',
  downloadUpdate: 'updater:download-update',
  getState: 'updater:get-state',
  installUpdate: 'updater:install-update',
  stateChanged: 'updater:state-changed',
} as const

const windowControlsIpcChannels = {
  close: 'window-controls:close',
  getState: 'window-controls:get-state',
  minimize: 'window-controls:minimize',
  stateChanged: 'window-controls:state-changed',
  toggleMaximize: 'window-controls:toggle-maximize',
} as const

const startupBridge: NoteStackStartupBridge = {
  exit: () => ipcRenderer.invoke(startupIpcChannels.exit),
  getState: () => ipcRenderer.invoke(startupIpcChannels.getState),
  openBackendLog: () => ipcRenderer.invoke(startupIpcChannels.openBackendLog),
  retry: () => ipcRenderer.invoke(startupIpcChannels.retry),
  subscribe: (listener: (state: StartupState) => void) => {
    const handleStateChange = (_event: unknown, state: StartupState) => {
      listener(state)
    }

    ipcRenderer.on(startupIpcChannels.stateChanged, handleStateChange)

    return () => {
      ipcRenderer.removeListener(
        startupIpcChannels.stateChanged,
        handleStateChange
      )
    }
  },
}

const updaterBridge: NoteStackUpdaterBridge = {
  checkForUpdates: () => {
    return ipcRenderer.invoke(updaterIpcChannels.checkForUpdates)
  },
  downloadUpdate: () => {
    return ipcRenderer.invoke(updaterIpcChannels.downloadUpdate)
  },
  getState: () => {
    return ipcRenderer.invoke(updaterIpcChannels.getState)
  },
  installUpdate: () => {
    return ipcRenderer.invoke(updaterIpcChannels.installUpdate)
  },
  subscribe: (listener: (state: UpdaterState) => void) => {
    const handleStateChange = (_event: unknown, state: UpdaterState) => {
      listener(state)
    }

    ipcRenderer.on(updaterIpcChannels.stateChanged, handleStateChange)

    return () => {
      ipcRenderer.removeListener(
        updaterIpcChannels.stateChanged,
        handleStateChange
      )
    }
  },
}

const windowControlsBridge: NoteStackWindowControlsBridge = {
  close: () => ipcRenderer.invoke(windowControlsIpcChannels.close),
  getState: () => ipcRenderer.invoke(windowControlsIpcChannels.getState),
  minimize: () => ipcRenderer.invoke(windowControlsIpcChannels.minimize),
  subscribe: (listener: (state: WindowControlsState) => void) => {
    const handleStateChange = (_event: unknown, state: WindowControlsState) => {
      listener(state)
    }

    ipcRenderer.on(windowControlsIpcChannels.stateChanged, handleStateChange)

    return () => {
      ipcRenderer.removeListener(
        windowControlsIpcChannels.stateChanged,
        handleStateChange
      )
    }
  },
  toggleMaximize: () =>
    ipcRenderer.invoke(windowControlsIpcChannels.toggleMaximize),
}

contextBridge.exposeInMainWorld('noteStackStartup', startupBridge)
contextBridge.exposeInMainWorld('noteStackUpdater', updaterBridge)
contextBridge.exposeInMainWorld('noteStackWindowControls', windowControlsBridge)
