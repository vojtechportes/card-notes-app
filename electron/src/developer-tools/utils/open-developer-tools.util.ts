import type { DeveloperToolsPreferences } from '../types/developer-tools-preferences.js'
import type { DeveloperToolsWindow } from '../types/developer-tools-ipc.js'

export const openDeveloperTools = (
  window: DeveloperToolsWindow | null,
  preferences: DeveloperToolsPreferences
): void => {
  if (!preferences.enabled) {
    throw new Error('developer-tools-disabled')
  }

  if (!window || window.isDestroyed()) {
    throw new Error('developer-tools-window-unavailable')
  }

  window.webContents.openDevTools({ mode: 'detach' })
}
