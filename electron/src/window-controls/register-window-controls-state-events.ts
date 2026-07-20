import type { BrowserWindow } from 'electron'
import { windowControlsIpcChannels } from './window-controls-ipc-channels.js'

export const registerWindowControlsStateEvents = (
  browserWindow: BrowserWindow
): void => {
  const emitState = () => {
    browserWindow.webContents.send(windowControlsIpcChannels.stateChanged, {
      isMaximized: browserWindow.isMaximized(),
    })
  }

  browserWindow.on('maximize', emitState)
  browserWindow.on('unmaximize', emitState)
}
