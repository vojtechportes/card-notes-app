import { ipcMain } from 'electron'
import { updaterIpcChannels } from './updater-ipc-channels.js'
import type { UpdaterService } from './create-updater-service.js'

export const registerUpdaterIpc = (updaterService: UpdaterService): void => {
  ipcMain.handle(updaterIpcChannels.getPreferences, () => {
    return updaterService.getPreferences()
  })

  ipcMain.handle(updaterIpcChannels.getState, () => {
    return updaterService.getState()
  })

  ipcMain.handle(updaterIpcChannels.checkForUpdates, () => {
    return updaterService.checkForUpdates()
  })

  ipcMain.handle(updaterIpcChannels.downloadUpdate, () => {
    return updaterService.downloadUpdate()
  })

  ipcMain.handle(
    updaterIpcChannels.setAllowPrerelease,
    (_event, allowPrerelease: unknown) => {
      if (typeof allowPrerelease !== 'boolean') {
        throw new Error('The prerelease update preference must be a boolean.')
      }

      return updaterService.setAllowPrerelease(allowPrerelease)
    }
  )

  ipcMain.handle(updaterIpcChannels.installUpdate, () => {
    return updaterService.installUpdate()
  })
}
