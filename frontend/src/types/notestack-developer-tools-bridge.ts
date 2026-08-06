import type { BackendLogOpenResult } from './backend-log-open-result'
import type { DeveloperToolsPreferences } from './developer-tools-preferences'

export interface NoteStackDeveloperToolsBridge {
  getPreferences: () => Promise<DeveloperToolsPreferences>
  openBackendLog: () => Promise<BackendLogOpenResult>
  openDeveloperTools: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<DeveloperToolsPreferences>
}
