import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'
import { createLocalMutationMetadata } from '../sync/utils/create-local-mutation-metadata.util'
import type { GeneralSettingSyncRecord } from './types/general-setting-sync-record'

interface SettingRow {
  key: string
  value_json: string
  mutation_id: string
  modified_by_device_id: string
  modified_at: string
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

  findAllWithMutationMetadata(): GeneralSettingSyncRecord[] {
    return (
      this.getDatabase()
        .prepare('SELECT * FROM app_settings ORDER BY key ASC')
        .all() as SettingRow[]
    ).map((row) => ({
      key: row.key,
      value: JSON.parse(row.value_json) as unknown,
      mutationId: row.mutation_id,
      modifiedByDeviceId: row.modified_by_device_id,
      modifiedAt: row.modified_at,
    }))
  }

  setValue(key: string, value: unknown): void {
    this.setValues(new Map([[key, value]]))
  }

  setValues(values: ReadonlyMap<string, unknown>): void {
    if (values.size === 0) {
      return
    }

    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const upsertSetting = database.prepare(`
      INSERT INTO app_settings (
        key, value_json, updated_at, mutation_id,
        modified_by_device_id, modified_at
      ) VALUES (
        @key, @valueJson, @updatedAt, @mutationId,
        @modifiedByDeviceId, @modifiedAt
      )
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at,
        mutation_id = excluded.mutation_id,
        modified_by_device_id = excluded.modified_by_device_id,
        modified_at = excluded.modified_at
    `)
    const applyValues = database.transaction(() => {
      for (const [key, value] of values) {
        upsertSetting.run({
          key,
          valueJson: JSON.stringify(value),
          updatedAt: timestamp,
          ...mutation,
        })
      }
    })

    applyValues()
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
