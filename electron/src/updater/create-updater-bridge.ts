import type { IpcRenderer } from 'electron'
import { updaterIpcChannels } from './updater-ipc-channels.js'
import type {
  NoteStackUpdaterBridge,
  UpdaterState,
} from './updater-contract.js'

type UpdaterIpcRenderer = Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>

export const createUpdaterBridge = (
  ipcRenderer: UpdaterIpcRenderer
): NoteStackUpdaterBridge => {
  return {
    checkForUpdates: () => {
      return ipcRenderer.invoke(updaterIpcChannels.checkForUpdates)
    },
    downloadUpdate: () => {
      return ipcRenderer.invoke(updaterIpcChannels.downloadUpdate)
    },
    getPreferences: () => {
      return ipcRenderer.invoke(updaterIpcChannels.getPreferences)
    },
    getState: () => {
      return ipcRenderer.invoke(updaterIpcChannels.getState)
    },
    installUpdate: () => {
      return ipcRenderer.invoke(updaterIpcChannels.installUpdate)
    },
    setAllowPrerelease: (allowPrerelease) => {
      return ipcRenderer.invoke(
        updaterIpcChannels.setAllowPrerelease,
        allowPrerelease
      )
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
