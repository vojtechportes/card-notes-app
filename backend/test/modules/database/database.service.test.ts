import DatabaseConstructor from 'better-sqlite3'
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

interface PragmaColumnRow {
  name: string
}

const createdDirectories: string[] = []

function createService(): { service: DatabaseService; databasePath: string } {
  const directory = mkdtempSync(join(tmpdir(), 'card-notes-db-'))
  createdDirectories.push(directory)

  const databasePath = join(directory, 'card-notes.sqlite')
  const service = new DatabaseService({ filePath: databasePath })

  return { service, databasePath }
}

function createLegacyDatabase(databasePath: string): void {
  const database = new DatabaseConstructor(databasePath)

  database.exec(`
    CREATE TABLE schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO schema_migrations (id) VALUES ('001-create-app-schema');

    CREATE TABLE note_columns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      config_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE note_values (
      note_id TEXT NOT NULL,
      column_id TEXT NOT NULL,
      value_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (note_id, column_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO note_columns (
      id,
      name,
      title,
      type,
      sort_order,
      is_hidden,
      is_default,
      config_json,
      created_at,
      updated_at
    ) VALUES (
      'legacy-column-id',
      'summary',
      'Summary',
      'text',
      2,
      0,
      0,
      NULL,
      '2026-07-01T10:00:00.000Z',
      '2026-07-01T10:00:00.000Z'
    );

    INSERT INTO notes (id, created_at, updated_at)
    VALUES (
      'legacy-note-id',
      '2026-07-02T10:00:00.000Z',
      '2026-07-03T10:00:00.000Z'
    );

    INSERT INTO note_values (
      note_id,
      column_id,
      value_json,
      created_at,
      updated_at
    ) VALUES (
      'legacy-note-id',
      'legacy-column-id',
      '"Migrated value"',
      '2026-07-02T10:00:00.000Z',
      '2026-07-03T10:00:00.000Z'
    );

    INSERT INTO app_settings (key, value_json, updated_at)
    VALUES (
      'textTruncationLength',
      '120',
      '2026-07-04T10:00:00.000Z'
    );
  `)

  database.close()
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

  it('creates the required phase 7 baseline tables and note type columns', () => {
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
        'note_types',
        'note_columns',
        'notes',
        'note_values',
        'labels',
        'app_settings',
      ])
    )

    const noteColumnNames = service
      .getConnection()
      .prepare("PRAGMA table_info('note_columns')")
      .all()
      .map((row) => (row as PragmaColumnRow).name)
    const noteNames = service
      .getConnection()
      .prepare("PRAGMA table_info('notes')")
      .all()
      .map((row) => (row as PragmaColumnRow).name)

    expect(noteColumnNames).toContain('note_type_id')
    expect(noteNames).toContain('note_type_id')
    service.close()
  })

  it('seeds the default note type and its default columns on fresh installs', () => {
    const { service } = createService()

    service.initialize()

    const noteTypes = service
      .getConnection()
      .prepare('SELECT id, title FROM note_types')
      .all() as Array<{ id: string; title: string }>

    expect(noteTypes).toHaveLength(1)
    expect(noteTypes[0].title).toBe('Default')

    const defaultColumns = service
      .getConnection()
      .prepare(
        `
        SELECT note_type_id, name, is_default
        FROM note_columns
        WHERE note_type_id = ?
        ORDER BY sort_order ASC
      `
      )
      .all(noteTypes[0].id) as Array<{
      note_type_id: string
      name: string
      is_default: number
    }>

    expect(defaultColumns.map((column) => column.name)).toEqual([
      'createdAt',
      'updatedAt',
    ])
    expect(defaultColumns.every((column) => column.is_default === 1)).toBe(true)
    service.close()
  })

  it('migrates legacy single-type databases into the default note type without data loss', () => {
    const { service, databasePath } = createService()

    createLegacyDatabase(databasePath)
    service.initialize()

    const database = service.getConnection()
    const noteType = database
      .prepare(
        'SELECT id, title FROM note_types ORDER BY created_at ASC LIMIT 1'
      )
      .get() as { id: string; title: string }
    const migratedColumn = database
      .prepare('SELECT note_type_id, name FROM note_columns WHERE id = ?')
      .get('legacy-column-id') as { note_type_id: string; name: string }
    const migratedNote = database
      .prepare(
        'SELECT note_type_id, created_at, updated_at FROM notes WHERE id = ?'
      )
      .get('legacy-note-id') as {
      note_type_id: string
      created_at: string
      updated_at: string
    }
    const migratedValue = database
      .prepare(
        'SELECT value_json FROM note_values WHERE note_id = ? AND column_id = ?'
      )
      .get('legacy-note-id', 'legacy-column-id') as { value_json: string }
    const preservedSetting = database
      .prepare('SELECT value_json FROM app_settings WHERE key = ?')
      .get('textTruncationLength') as { value_json: string }

    expect(noteType.title).toBe('Default')
    expect(migratedColumn).toEqual({
      note_type_id: noteType.id,
      name: 'summary',
    })
    expect(migratedNote).toEqual({
      note_type_id: noteType.id,
      created_at: '2026-07-02T10:00:00.000Z',
      updated_at: '2026-07-03T10:00:00.000Z',
    })
    expect(migratedValue.value_json).toBe('"Migrated value"')
    expect(preservedSetting.value_json).toBe('120')
    service.close()
  })

  it('enforces note ownership and scopes column-name uniqueness per note type', () => {
    const { service } = createService()

    service.initialize()

    const database = service.getConnection()
    const defaultNoteType = database
      .prepare('SELECT id FROM note_types WHERE title = ?')
      .get('Default') as { id: string }
    const secondNoteTypeId = '22222222-2222-4222-8222-222222222222'

    database
      .prepare('INSERT INTO note_types (id, title) VALUES (?, ?)')
      .run(secondNoteTypeId, 'Recipes')

    expect(() =>
      database
        .prepare(
          'INSERT INTO notes (id, created_at, updated_at) VALUES (?, ?, ?)'
        )
        .run(
          'invalid-note',
          '2026-07-05T10:00:00.000Z',
          '2026-07-05T10:00:00.000Z'
        )
    ).toThrow()

    expect(() =>
      database
        .prepare(
          'INSERT INTO notes (id, note_type_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
        )
        .run(
          'invalid-note-type',
          'missing-note-type',
          '2026-07-05T10:00:00.000Z',
          '2026-07-05T10:00:00.000Z'
        )
    ).toThrow()

    const insertColumn = database.prepare(
      `
      INSERT INTO note_columns (
        id,
        note_type_id,
        name,
        title,
        type,
        sort_order,
        is_hidden,
        is_default,
        config_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    insertColumn.run(
      'shared-default-id',
      defaultNoteType.id,
      'sharedName',
      'Shared Name',
      'text',
      4,
      0,
      0,
      null
    )

    expect(() =>
      insertColumn.run(
        'shared-second-type-id',
        secondNoteTypeId,
        'sharedName',
        'Shared Name',
        'text',
        4,
        0,
        0,
        null
      )
    ).not.toThrow()

    expect(() =>
      insertColumn.run(
        'shared-duplicate-id',
        defaultNoteType.id,
        'sharedName',
        'Duplicate Shared Name',
        'text',
        5,
        0,
        0,
        null
      )
    ).toThrow()

    service.close()
  })

  it('runs initialization idempotently across all migrations', () => {
    const { service } = createService()

    service.initialize()
    service.initialize()

    const migrationCount = service
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM schema_migrations')
      .get() as CountRow
    const defaultNoteTypeCount = service
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM note_types WHERE title = ?')
      .get('Default') as CountRow

    expect(migrationCount.count).toBe(3)
    expect(defaultNoteTypeCount.count).toBe(1)
    service.close()
  })
})
