import { developerToolsIpcChannels } from './developer-tools-ipc-channels.js'
import type { DeveloperToolsPreferencesStore } from './developer-tools-preferences-store.js'
import type { DeveloperToolsIpcDependencies } from './types/developer-tools-ipc.js'
import { openDeveloperTools } from './utils/open-developer-tools.util.js'
import { parseDeveloperToolsEnabled } from './utils/parse-developer-tools-enabled.util.js'

export const registerDeveloperToolsIpc = (
  preferencesStore: Pick<
    DeveloperToolsPreferencesStore,
    'getPreferences' | 'setEnabled'
  >,
  dependencies: DeveloperToolsIpcDependencies
): void => {
  dependencies.ipcMain.handle(developerToolsIpcChannels.getPreferences, () =>
    preferencesStore.getPreferences()
  )

  dependencies.ipcMain.handle(
    developerToolsIpcChannels.setEnabled,
    (_event, enabled) =>
      preferencesStore.setEnabled(parseDeveloperToolsEnabled(enabled))
  )

  dependencies.ipcMain.handle(developerToolsIpcChannels.open, (event) => {
    openDeveloperTools(
      dependencies.getInvokingWindow(event.sender),
      preferencesStore.getPreferences()
    )
  })
}
