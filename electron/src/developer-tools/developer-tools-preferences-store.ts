import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { DeveloperToolsPreferences } from './types/developer-tools-preferences.js'

const defaultDeveloperToolsPreferences: DeveloperToolsPreferences = {
  enabled: false,
}

export class DeveloperToolsPreferencesStore {
  constructor(private readonly preferencesFilePath: string) {}

  getPreferences(): DeveloperToolsPreferences {
    try {
      const value = JSON.parse(
        readFileSync(this.preferencesFilePath, 'utf8')
      ) as Partial<DeveloperToolsPreferences>

      if (typeof value.enabled !== 'boolean') {
        return defaultDeveloperToolsPreferences
      }

      return { enabled: value.enabled }
    } catch {
      return defaultDeveloperToolsPreferences
    }
  }

  setEnabled(enabled: boolean): DeveloperToolsPreferences {
    const preferences = { enabled }

    mkdirSync(path.dirname(this.preferencesFilePath), { recursive: true })

    const temporaryPath = `${this.preferencesFilePath}.tmp`

    writeFileSync(temporaryPath, JSON.stringify(preferences, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })
    renameSync(temporaryPath, this.preferencesFilePath)

    return preferences
  }
}
