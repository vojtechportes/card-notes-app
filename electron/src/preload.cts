import type { IpcRenderer } from 'electron'
import type { NoteStackUpdaterBridge, UpdaterState } from './updater/updater-contract.js'

const { contextBridge, ipcRenderer } = require('electron') as {
  contextBridge: {
    exposeInMainWorld: (apiKey: string, api: unknown) => void
  }
  ipcRenderer: Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>
}

const updaterIpcChannels = {
  checkForUpdates: 'updater:check-for-updates',
  downloadUpdate: 'updater:download-update',
  getState: 'updater:get-state',
  installUpdate: 'updater:install-update',
  stateChanged: 'updater:state-changed',
} as const

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

contextBridge.exposeInMainWorld('noteStackUpdater', updaterBridge)
