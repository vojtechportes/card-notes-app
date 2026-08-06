import type { BackendLogOpenResult } from '../../startup/types/backend-log-open-result.js'
import type { DeveloperToolsPreferences } from './developer-tools-preferences.js'

export interface NoteStackDeveloperToolsBridge {
  getPreferences: () => Promise<DeveloperToolsPreferences>
  openBackendLog: () => Promise<BackendLogOpenResult>
  openDeveloperTools: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<DeveloperToolsPreferences>
}
