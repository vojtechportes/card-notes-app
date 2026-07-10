import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'

interface SettingRow {
  key: string
  value_json: string
}

@Injectable()
export class GeneralSettingsRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findValue<TValue>(key: string): TValue | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM app_settings WHERE key = ?')
      .get(key) as SettingRow | undefined

    return row ? (JSON.parse(row.value_json) as TValue) : undefined
  }

  setValue(key: string, value: unknown): void {
    this.getDatabase()
      .prepare(
        `
        INSERT INTO app_settings (key, value_json, updated_at)
        VALUES (@key, @valueJson, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = CURRENT_TIMESTAMP
      `
      )
      .run({ key, valueJson: JSON.stringify(value) })
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
