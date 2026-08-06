import type { BackendLogOpenResult } from '../../startup/types/backend-log-open-result.js'

export interface DeveloperToolsWindow {
  isDestroyed: () => boolean
  webContents: {
    openDevTools: (options: { mode: 'detach' }) => void
  }
}

export interface DeveloperToolsIpcEvent {
  sender: unknown
}

export type DeveloperToolsIpcHandler = (
  event: DeveloperToolsIpcEvent,
  value?: unknown
) => unknown

export interface DeveloperToolsIpcRegistrar {
  handle: (channel: string, handler: DeveloperToolsIpcHandler) => void
}

export interface DeveloperToolsIpcDependencies {
  getInvokingWindow: (sender: unknown) => DeveloperToolsWindow | null
  ipcMain: DeveloperToolsIpcRegistrar
  openBackendLog: () => Promise<BackendLogOpenResult>
}
