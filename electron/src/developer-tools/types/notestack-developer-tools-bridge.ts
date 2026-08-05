import type { DeveloperToolsPreferences } from './developer-tools-preferences.js'

export interface NoteStackDeveloperToolsBridge {
  getPreferences: () => Promise<DeveloperToolsPreferences>
  openDeveloperTools: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<DeveloperToolsPreferences>
}
