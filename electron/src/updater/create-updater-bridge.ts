import type { IpcRenderer } from 'electron'
import { updaterIpcChannels } from './updater-ipc-channels.js'
import type { CardNotesUpdaterBridge, UpdaterState } from './updater-contract.js'

type UpdaterIpcRenderer = Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>

export const createUpdaterBridge = (
  ipcRenderer: UpdaterIpcRenderer
): CardNotesUpdaterBridge => {
  return {
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
}

