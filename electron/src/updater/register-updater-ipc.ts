import { ipcMain } from 'electron'
import { updaterIpcChannels } from './updater-ipc-channels.js'
import type { UpdaterService } from './create-updater-service.js'

export const registerUpdaterIpc = (updaterService: UpdaterService): void => {
  ipcMain.handle(updaterIpcChannels.getState, () => {
    return updaterService.getState()
  })

  ipcMain.handle(updaterIpcChannels.checkForUpdates, () => {
    return updaterService.checkForUpdates()
  })

  ipcMain.handle(updaterIpcChannels.downloadUpdate, () => {
    return updaterService.downloadUpdate()
  })

  ipcMain.handle(updaterIpcChannels.installUpdate, () => {
    return updaterService.installUpdate()
  })
}

