import DatabaseConstructor from 'better-sqlite3'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseBackupService } from '../../../src/modules/database/database-backup.service'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { addSyncMetadataMigration } from '../../../src/modules/database/migrations/006-add-sync-metadata'
import { isUuidV4 } from '../../../src/modules/sync/utils/is-uuid-v4.util'

const createdDirectories: string[] = []

const createPersistentService = (): {
  databasePath: string
  directory: string
  service: DatabaseService
} => {
  const directory = mkdtempSync(join(tmpdir(), 'notestack-sync-db-'))
  const databasePath = join(directory, 'notestack.sqlite')
  const service = new DatabaseService({ filePath: databasePath })
  createdDirectories.push(directory)

  return { databasePath, directory, service }
}

const rewindToPrePhaseTen = (service: DatabaseService): void => {
  const database = service.getConnection()

  database.exec(`
    DROP TABLE sync_conflicts;
    DROP TABLE sync_provider_cursors;
    DROP TABLE sync_remote_objects;
    DROP TABLE sync_account_state;
    DROP TABLE sync_identity;
    DELETE FROM schema_migrations WHERE id = '006-add-sync-metadata';
  `)
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('sync metadata migration', () => {
  it('creates provider-neutral metadata with stable disabled identity defaults', () => {
    const service = new DatabaseService({ filePath: ':memory:' })

    service.initialize()

    const database = service.getConnection()
    const tableNames = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'sync_%' ORDER BY name"
      )
      .all()
      .map((row) => (row as { name: string }).name)
    const identity = database
      .prepare('SELECT device_id, workspace_id FROM sync_identity WHERE id = 1')
      .get() as { device_id: string; workspace_id: string }
    const account = database
      .prepare(
        'SELECT is_enabled, active_provider, connection_state, metadata_json FROM sync_account_state WHERE id = 1'
      )
      .get()

    expect(tableNames).toEqual([
      'sync_account_state',
      'sync_conflicts',
      'sync_identity',
      'sync_outbox',
      'sync_provider_cursors',
      'sync_remote_objects',
    ])
    expect(isUuidV4(identity.device_id)).toBe(true)
    expect(isUuidV4(identity.workspace_id)).toBe(true)
    expect(account).toEqual({
      is_enabled: 0,
      active_provider: null,
      connection_state: 'disabled',
      metadata_json: null,
    })

    const originalIdentity = identity
    service.initialize()
    const restartedIdentity = database
      .prepare('SELECT device_id, workspace_id FROM sync_identity WHERE id = 1')
      .get()

    expect(restartedIdentity).toEqual(originalIdentity)
    expect(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM schema_migrations WHERE id = '006-add-sync-metadata'"
        )
        .get()
    ).toEqual({ count: 1 })
    service.close()
  })

  it('enforces provider, entity, cursor, and conflict constraints', () => {
    const service = new DatabaseService({ filePath: ':memory:' })
    service.initialize()
    const database = service.getConnection()
    const identity = database
      .prepare('SELECT workspace_id FROM sync_identity WHERE id = 1')
      .get() as { workspace_id: string }

    expect(() =>
      database
        .prepare(
          'UPDATE sync_account_state SET active_provider = ? WHERE id = 1'
        )
        .run('dropbox')
    ).toThrow()
    expect(() =>
      database
        .prepare(
          `INSERT INTO sync_remote_objects (
            id, workspace_id, provider, logical_key, entity_kind,
            provider_object_id, provider_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'remote-id',
          identity.workspace_id,
          'google-drive',
          'bad.json',
          'unknown',
          'provider-id',
          'version'
        )
    ).toThrow()
    expect(() =>
      database
        .prepare(
          `INSERT INTO sync_provider_cursors (
            id, workspace_id, provider, cursor_generation
          ) VALUES (?, ?, ?, ?)`
        )
        .run('cursor-id', identity.workspace_id, 'one-drive', -1)
    ).toThrow()
    expect(() =>
      database
        .prepare(
          `INSERT INTO sync_conflicts (
            id, workspace_id, entity_kind, conflict_type, resolution_state
          ) VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          'conflict-id',
          identity.workspace_id,
          'note',
          'edit-edit',
          'discarded'
        )
    ).toThrow()
    service.close()
  })

  it('keeps migration 006 idempotent when invoked directly', () => {
    const service = new DatabaseService({ filePath: ':memory:' })
    service.initialize()

    expect(() =>
      addSyncMetadataMigration.up(service.getConnection())
    ).not.toThrow()
    expect(
      service
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM sync_identity')
        .get()
    ).toEqual({ count: 1 })
    service.close()
  })
})

describe(DatabaseBackupService.name, () => {
  it('captures and verifies existing WAL-backed data before migration 006', () => {
    const { databasePath, service } = createPersistentService()
    service.initialize()
    rewindToPrePhaseTen(service)

    const database = service.getConnection()
    const noteType = database
      .prepare("SELECT id FROM note_types WHERE title = 'Default'")
      .get() as { id: string }

    database
      .prepare(
        'INSERT INTO notes (id, note_type_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .run(
        'wal-note',
        noteType.id,
        '2026-07-31T10:00:00.000Z',
        '2026-07-31T10:00:00.000Z'
      )

    service.initialize()

    const backupService = new DatabaseBackupService()
    const backupPath = backupService.getBackupPath(
      databasePath,
      'before-phase-10'
    )
    expect(existsSync(backupPath)).toBe(true)
    expect(() => backupService.verifyBackup(backupPath)).not.toThrow()

    const backup = new DatabaseConstructor(backupPath, {
      fileMustExist: true,
      readonly: true,
    })
    expect(
      backup.prepare("SELECT id FROM notes WHERE id = 'wal-note'").get()
    ).toEqual({ id: 'wal-note' })
    expect(
      backup
        .prepare(
          "SELECT COUNT(*) AS count FROM schema_migrations WHERE id = '006-add-sync-metadata'"
        )
        .get()
    ).toEqual({ count: 0 })
    backup.close()
    service.close()
  })

  it('reuses a verified backup across restart without changing stable IDs', () => {
    const { databasePath, service } = createPersistentService()
    service.initialize()
    rewindToPrePhaseTen(service)
    service.initialize()

    const firstIdentity = service
      .getConnection()
      .prepare('SELECT device_id, workspace_id FROM sync_identity WHERE id = 1')
      .get()
    service.close()

    const restarted = new DatabaseService({ filePath: databasePath })
    restarted.initialize()
    const secondIdentity = restarted
      .getConnection()
      .prepare('SELECT device_id, workspace_id FROM sync_identity WHERE id = 1')
      .get()

    expect(secondIdentity).toEqual(firstIdentity)
    restarted.close()
  })

  it('creates a source-correlated backup when the database at a path is replaced', () => {
    const { databasePath, directory, service } = createPersistentService()
    service.initialize()
    rewindToPrePhaseTen(service)
    service
      .getConnection()
      .prepare('INSERT INTO app_settings (key, value_json) VALUES (?, ?)')
      .run('sourceMarker', JSON.stringify('original'))
    service.initialize()
    service.close()

    rmSync(databasePath, { force: true })
    rmSync(`${databasePath}-wal`, { force: true })
    rmSync(`${databasePath}-shm`, { force: true })

    const replacement = new DatabaseService({ filePath: databasePath })
    replacement.initialize()
    rewindToPrePhaseTen(replacement)
    replacement
      .getConnection()
      .prepare('INSERT INTO app_settings (key, value_json) VALUES (?, ?)')
      .run('sourceMarker', JSON.stringify('replacement'))
    replacement.initialize()
    replacement.close()

    const backupDirectory = join(directory, 'backups')
    const backupPaths = readdirSync(backupDirectory)
      .filter((fileName) => fileName.endsWith('.sqlite'))
      .map((fileName) => join(backupDirectory, fileName))

    expect(backupPaths).toHaveLength(2)
    expect(
      backupPaths.some((backupPath) => {
        const backup = new DatabaseConstructor(backupPath, {
          fileMustExist: true,
          readonly: true,
        })
        const marker = backup
          .prepare(
            "SELECT value_json FROM app_settings WHERE key = 'sourceMarker'"
          )
          .get() as { value_json: string }
        backup.close()

        return JSON.parse(marker.value_json) === 'replacement'
      })
    ).toBe(true)
  })
  it('aborts migration when a deterministic preexisting backup is corrupt', () => {
    const { databasePath, service } = createPersistentService()
    service.initialize()
    rewindToPrePhaseTen(service)

    const backupService = new DatabaseBackupService()
    const backupPath = backupService.getBackupPath(
      databasePath,
      'before-phase-10'
    )
    mkdirSync(dirname(backupPath), { recursive: true })
    writeFileSync(backupPath, 'not a sqlite database')

    expect(() => service.initialize()).toThrow()
    expect(
      service
        .getConnection()
        .prepare(
          "SELECT COUNT(*) AS count FROM schema_migrations WHERE id = '006-add-sync-metadata'"
        )
        .get()
    ).toEqual({ count: 0 })
    service.close()
  })
})
