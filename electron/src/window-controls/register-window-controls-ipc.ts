import { ipcMain } from 'electron'
import { getInvokingWindow } from './get-invoking-window.util.js'
import { windowControlsIpcChannels } from './window-controls-ipc-channels.js'

export const registerWindowControlsIpc = (): void => {
  ipcMain.handle(windowControlsIpcChannels.getState, (event) => ({
    isMaximized: getInvokingWindow(event.sender)?.isMaximized() ?? false,
  }))

  ipcMain.handle(windowControlsIpcChannels.minimize, (event) => {
    getInvokingWindow(event.sender)?.minimize()
  })

  ipcMain.handle(windowControlsIpcChannels.toggleMaximize, (event) => {
    const window = getInvokingWindow(event.sender)

    if (!window) {
      return
    }

    if (window.isMaximized()) {
      window.unmaximize()
      return
    }

    window.maximize()
  })

  ipcMain.handle(windowControlsIpcChannels.close, (event) => {
    getInvokingWindow(event.sender)?.close()
  })
}
