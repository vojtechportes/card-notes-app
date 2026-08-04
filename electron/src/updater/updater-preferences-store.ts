import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { UpdaterPreferences } from './types/updater-preferences.js'

const defaultUpdaterPreferences: UpdaterPreferences = {
  allowPrerelease: false,
}

export class UpdaterPreferencesStore {
  constructor(private readonly preferencesFilePath: string) {}

  getPreferences(): UpdaterPreferences {
    try {
      const value = JSON.parse(
        readFileSync(this.preferencesFilePath, 'utf8')
      ) as Partial<UpdaterPreferences>

      if (typeof value.allowPrerelease !== 'boolean') {
        return defaultUpdaterPreferences
      }

      return {
        allowPrerelease: value.allowPrerelease,
      }
    } catch {
      return defaultUpdaterPreferences
    }
  }

  setAllowPrerelease(allowPrerelease: boolean): void {
    mkdirSync(path.dirname(this.preferencesFilePath), { recursive: true })

    const temporaryPath = `${this.preferencesFilePath}.tmp`

    writeFileSync(temporaryPath, JSON.stringify({ allowPrerelease }, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })
    renameSync(temporaryPath, this.preferencesFilePath)
  }
}
