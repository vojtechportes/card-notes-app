import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'

interface SqliteObjectRow {
  name: string
}

interface CountRow {
  count: number
}

const createdDirectories: string[] = []

function createService(): { service: DatabaseService; databasePath: string } {
  const directory = mkdtempSync(join(tmpdir(), 'card-notes-db-'))
  createdDirectories.push(directory)

  const databasePath = join(directory, 'card-notes.sqlite')
  const service = new DatabaseService({ filePath: databasePath })

  return { service, databasePath }
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe(DatabaseService.name, () => {
  it('opens a local sqlite database file', () => {
    const { service, databasePath } = createService()

    service.initialize()

    expect(existsSync(databasePath)).toBe(true)
    service.close()
  })

  it('creates the required baseline tables', () => {
    const { service } = createService()

    service.initialize()

    const tableNames = service
      .getConnection()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as SqliteObjectRow).name)

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'schema_migrations',
        'note_columns',
        'notes',
        'note_values',
        'app_settings',
      ])
    )

    service.close()
  })

  it('runs initialization idempotently', () => {
    const { service } = createService()

    service.initialize()
    service.initialize()

    const row = service
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM schema_migrations WHERE id = ?')
      .get('001-create-app-schema') as CountRow

    expect(row.count).toBe(1)
    service.close()
  })
})
