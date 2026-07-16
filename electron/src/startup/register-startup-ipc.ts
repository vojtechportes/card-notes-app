import { ipcMain } from 'electron'
import { startupIpcChannels } from './startup-ipc-channels.js'
import type { BackendLogOpenResult } from './types/backend-log-open-result.js'
import type { BackendStartupController } from './types/backend-startup-controller.js'

interface RegisterStartupIpcOptions {
  exit: () => void
  openBackendLog: () => Promise<BackendLogOpenResult>
}

export const registerStartupIpc = (
  controller: BackendStartupController,
  { exit, openBackendLog }: RegisterStartupIpcOptions
): void => {
  ipcMain.handle(startupIpcChannels.getState, () => controller.getState())
  ipcMain.handle(startupIpcChannels.retry, () => controller.retry())
  ipcMain.handle(startupIpcChannels.openBackendLog, openBackendLog)
  ipcMain.handle(startupIpcChannels.exit, exit)
}
