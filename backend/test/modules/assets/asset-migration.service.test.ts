import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AssetMigrationService } from '../../../src/modules/assets/asset-migration.service'
import { AssetsRepository } from '../../../src/modules/assets/assets.repository'
import { AssetsService } from '../../../src/modules/assets/assets.service'
import { DatabaseService } from '../../../src/modules/database/database.service'

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP2S8QAAAABJRU5ErkJggg=='
const pngBytes = Buffer.from(pngDataUrl.split(',')[1], 'base64')

describe('AssetMigrationService', () => {
  let dataRoot: string
  let databaseService: DatabaseService
  let migrationService: AssetMigrationService

  beforeEach(() => {
    dataRoot = mkdtempSync(join(tmpdir(), 'notestack-asset-migration-'))
    process.env.CARD_NOTES_DATA_ROOT = dataRoot
    databaseService = new DatabaseService({
      filePath: join(dataRoot, 'card-notes.sqlite'),
    })
    databaseService.initialize()

    const database = databaseService.getConnection()
    database
      .prepare(
        'INSERT INTO note_types (id, title, created_at, updated_at) ' +
          "VALUES ('type-id', 'Type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .run()
    database
      .prepare(
        'INSERT INTO note_columns (' +
          'id, note_type_id, name, title, type, sort_order, is_default, ' +
          'is_hidden, created_at, updated_at' +
          ') VALUES (' +
          "'image-column', 'type-id', 'image', 'Image', 'image', 0, 0, 0, " +
          'CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run()
    database
      .prepare(
        'INSERT INTO notes (id, note_type_id, created_at, updated_at) ' +
          "VALUES ('note-id', 'type-id', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .run()

    const assetsService = new AssetsService(
      new AssetsRepository(databaseService)
    )
    migrationService = new AssetMigrationService(databaseService, assetsService)
  })

  afterEach(() => {
    databaseService.close()
    delete process.env.CARD_NOTES_DATA_ROOT
    rmSync(dataRoot, { force: true, recursive: true })
  })

  it('migrates legacy data URLs idempotently with deduplication', () => {
    const database = databaseService.getConnection()
    database
      .prepare(
        'INSERT INTO note_values (' +
          'note_id, column_id, value_json, created_at, updated_at' +
          ') VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(
        'note-id',
        'image-column',
        JSON.stringify([
          { dataUrl: pngDataUrl, fileName: 'first.png' },
          { dataUrl: pngDataUrl, fileName: 'second.png' },
        ])
      )

    database
      .prepare(
        `
        UPDATE sync_account_state
        SET provider_workspace_id = 'provider-workspace',
            active_provider = 'google-drive',
            connection_state = 'disconnected'
        WHERE id = 1
      `
      )
      .run()

    migrationService.migrateLegacyNoteImages()
    migrationService.migrateLegacyNoteImages()

    const row = database
      .prepare(
        'SELECT value_json FROM note_values ' +
          "WHERE note_id = 'note-id' AND column_id = 'image-column'"
      )
      .get() as { value_json: string }
    const references = JSON.parse(row.value_json) as Array<{
      assetId: string
      dataUrl?: string
    }>

    expect(references).toHaveLength(2)
    expect(references[0].assetId).toBe(references[1].assetId)
    expect(references.every((reference) => !reference.dataUrl)).toBe(true)
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM assets').get()
    ).toEqual({ count: 1 })
    expect(
      database
        .prepare('SELECT entity_kind FROM sync_outbox ORDER BY entity_kind ASC')
        .all()
    ).toEqual([{ entity_kind: 'asset' }, { entity_kind: 'note' }])
  })

  it('leaves retained tombstone image values untouched and unjournaled', () => {
    const database = databaseService.getConnection()
    const originalValue = JSON.stringify({
      dataUrl: pngDataUrl,
      fileName: 'deleted.png',
    })
    database
      .prepare(
        'INSERT INTO note_values (' +
          'note_id, column_id, value_json, created_at, updated_at' +
          ') VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run('note-id', 'image-column', originalValue)
    database
      .prepare(
        `UPDATE notes
         SET deleted_at = ?, deletion_mutation_id = ?, deletion_device_id = ?
         WHERE id = 'note-id'`
      )
      .run('2026-07-31T10:00:00.000Z', 'deletion-mutation', 'deletion-device')
    database
      .prepare(
        `UPDATE sync_account_state
         SET provider_workspace_id = 'provider-workspace',
             active_provider = 'google-drive',
             connection_state = 'disconnected'
         WHERE id = 1`
      )
      .run()

    migrationService.migrateLegacyNoteImages()

    expect(
      database
        .prepare("SELECT value_json FROM note_values WHERE note_id = 'note-id'")
        .get()
    ).toEqual({ value_json: originalValue })
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM assets').get()
    ).toEqual({
      count: 0,
    })
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get()
    ).toEqual({ count: 0 })
  })
  it('leaves an invalid legacy value untouched for recovery', () => {
    const database = databaseService.getConnection()
    const originalValue = JSON.stringify({
      dataUrl: 'data:image/png;base64,not-valid!',
      fileName: 'broken.png',
    })
    database
      .prepare(
        'INSERT INTO note_values (' +
          'note_id, column_id, value_json, created_at, updated_at' +
          ') VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run('note-id', 'image-column', originalValue)

    migrationService.migrateLegacyNoteImages()

    expect(
      database
        .prepare(
          'SELECT value_json FROM note_values ' +
            "WHERE note_id = 'note-id' AND column_id = 'image-column'"
        )
        .get()
    ).toEqual({ value_json: originalValue })
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM assets').get()
    ).toEqual({ count: 0 })
  })

  it('migrates a single legacy data URL without changing display metadata', () => {
    const database = databaseService.getConnection()
    database
      .prepare(
        'INSERT INTO note_values (' +
          'note_id, column_id, value_json, created_at, updated_at' +
          ') VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(
        'note-id',
        'image-column',
        JSON.stringify({
          altText: 'Receipt',
          dataUrl: pngDataUrl,
          fileName: 'receipt.png',
        })
      )

    migrationService.migrateLegacyNoteImages()

    const row = database
      .prepare(
        'SELECT value_json FROM note_values ' +
          "WHERE note_id = 'note-id' AND column_id = 'image-column'"
      )
      .get() as { value_json: string }

    expect(JSON.parse(row.value_json)).toMatchObject({
      altText: 'Receipt',
      assetId: expect.stringMatching(/^[a-f0-9]{64}$/),
      fileName: 'receipt.png',
      mimeType: 'image/png',
      size: pngBytes.length,
    })
  })

  it('imports a valid legacy local path and removes the machine path', () => {
    const database = databaseService.getConnection()
    const localPath = join(dataRoot, 'legacy.png')
    writeFileSync(localPath, pngBytes)
    database
      .prepare(
        'INSERT INTO note_values (' +
          'note_id, column_id, value_json, created_at, updated_at' +
          ') VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(
        'note-id',
        'image-column',
        JSON.stringify({ fileName: 'legacy.png', path: localPath })
      )

    migrationService.migrateLegacyNoteImages()

    const row = database
      .prepare(
        'SELECT value_json FROM note_values ' +
          "WHERE note_id = 'note-id' AND column_id = 'image-column'"
      )
      .get() as { value_json: string }
    const reference = JSON.parse(row.value_json) as {
      assetId: string
      path?: string
    }

    expect(reference.assetId).toMatch(/^[a-f0-9]{64}$/)
    expect(reference.path).toBeUndefined()
  })

  it('resumes safely after a partial multi-row migration restart', () => {
    const database = databaseService.getConnection()
    const invalidValue = JSON.stringify({
      dataUrl: 'data:image/png;base64,interrupted!',
      fileName: 'second.png',
    })
    database
      .prepare(
        'INSERT INTO notes (id, note_type_id, created_at, updated_at) ' +
          "VALUES ('note-id-2', 'type-id', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .run()
    const insertValue = database.prepare(
      'INSERT INTO note_values (' +
        'note_id, column_id, value_json, created_at, updated_at' +
        ') VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    )

    insertValue.run(
      'note-id',
      'image-column',
      JSON.stringify({ dataUrl: pngDataUrl, fileName: 'first.png' })
    )
    insertValue.run('note-id-2', 'image-column', invalidValue)

    migrationService.migrateLegacyNoteImages()

    const firstPassRows = database
      .prepare('SELECT note_id, value_json FROM note_values ORDER BY note_id')
      .all() as Array<{ note_id: string; value_json: string }>

    expect(JSON.parse(firstPassRows[0].value_json).assetId).toMatch(
      /^[a-f0-9]{64}$/
    )
    expect(firstPassRows[1].value_json).toBe(invalidValue)

    database
      .prepare(
        "UPDATE note_values SET value_json = ? WHERE note_id = 'note-id-2'"
      )
      .run(JSON.stringify({ dataUrl: pngDataUrl, fileName: 'second.png' }))

    const restartedService = new AssetMigrationService(
      databaseService,
      new AssetsService(new AssetsRepository(databaseService))
    )
    restartedService.migrateLegacyNoteImages()

    const resumedRows = database
      .prepare('SELECT value_json FROM note_values ORDER BY note_id')
      .all() as Array<{ value_json: string }>
    const assetIds = resumedRows.map(
      (row) => (JSON.parse(row.value_json) as { assetId: string }).assetId
    )

    expect(new Set(assetIds).size).toBe(1)
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM assets').get()
    ).toEqual({ count: 1 })
  })
})
