import type { IpcRenderer } from 'electron'
import { startupIpcChannels } from './startup-ipc-channels.js'
import type { NoteStackStartupBridge } from './types/notestack-startup-bridge.js'
import type { StartupState } from './types/startup-state.js'

type StartupIpcRenderer = Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>

export const createStartupBridge = (
  ipcRenderer: StartupIpcRenderer
): NoteStackStartupBridge => {
  return {
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
}
