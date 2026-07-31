import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetsController } from '../../../src/modules/assets/assets.controller'
import { AssetsRepository } from '../../../src/modules/assets/assets.repository'
import { AssetsService } from '../../../src/modules/assets/assets.service'
import { DatabaseService } from '../../../src/modules/database/database.service'

const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP2S8QAAAABJRU5ErkJggg==',
  'base64'
)

describe('AssetsService', () => {
  let dataRoot: string
  let databaseService: DatabaseService
  let repository: AssetsRepository
  let service: AssetsService

  beforeEach(() => {
    dataRoot = mkdtempSync(join(tmpdir(), 'notestack-assets-'))
    process.env.CARD_NOTES_DATA_ROOT = dataRoot
    databaseService = new DatabaseService({
      filePath: join(dataRoot, 'card-notes.sqlite'),
    })
    databaseService.initialize()
    repository = new AssetsRepository(databaseService)
    service = new AssetsService(repository)
  })

  afterEach(() => {
    databaseService.close()
    delete process.env.CARD_NOTES_DATA_ROOT
    rmSync(dataRoot, { force: true, recursive: true })
  })

  it('stores verified bytes by SHA-256 and deduplicates identical images', () => {
    const first = service.storeImage(pngBytes, {
      fileName: 'receipt.png',
      mimeType: 'image/png',
    })
    const second = service.storeImage(pngBytes, {
      fileName: 'copy.png',
      mimeType: 'image/png',
    })

    expect(first.assetId).toBe(
      createHash('sha256').update(pngBytes).digest('hex')
    )
    expect(second.assetId).toBe(first.assetId)
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM assets')
        .get()
    ).toEqual({ count: 1 })
    expect(service.readAsset(first.assetId).buffer).toEqual(pngBytes)
  })

  it('imports a supported absolute local path without persisting the path', () => {
    const localPath = join(dataRoot, 'incoming.png')
    writeFileSync(localPath, pngBytes)

    const reference = service.manageImageValue({
      path: localPath,
      altText: 'Incoming',
    })

    expect(reference).toMatchObject({
      altText: 'Incoming',
      fileName: 'incoming.png',
      mimeType: 'image/png',
      size: pngBytes.length,
    })
    expect(reference.path).toBeUndefined()
    expect(readFileSync(localPath)).toEqual(pngBytes)
  })

  it('rejects MIME mismatches and detects corrupted managed bytes', () => {
    expect(() =>
      service.storeImage(pngBytes, { mimeType: 'image/jpeg' })
    ).toThrow(/supported PNG/)

    const reference = service.storeImage(pngBytes)
    const record = databaseService
      .getConnection()
      .prepare('SELECT relative_path FROM assets WHERE asset_id = ?')
      .get(reference.assetId) as { relative_path: string }

    writeFileSync(join(dataRoot, record.relative_path), Buffer.from('broken'))

    expect(() => service.readAsset(reference.assetId)).toThrow(/integrity/)
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT integrity_state FROM assets WHERE asset_id = ?')
        .get(reference.assetId)
    ).toEqual({ integrity_state: 'corrupt' })
  })

  it('serves verified bytes with immutable image response headers', () => {
    const reference = service.storeImage(pngBytes)
    const headers = new Map<string, string>()
    let responseBody: Buffer | undefined
    const controller = new AssetsController(service)

    controller.getContent(reference.assetId, {
      end: (buffer) => {
        responseBody = buffer
      },
      setHeader: (name, value) => {
        headers.set(name, value)
      },
    })

    expect(responseBody).toEqual(pngBytes)
    expect(headers.get('Content-Type')).toBe('image/png')
    expect(headers.get('Content-Length')).toBe(String(pngBytes.length))
    expect(headers.get('Cache-Control')).toContain('immutable')
  })

  it('recovers when interrupted after the atomic file write but before catalog insertion', () => {
    const interruptedUpsert = vi
      .spyOn(repository, 'upsert')
      .mockImplementationOnce(() => {
        throw new Error('simulated catalog interruption')
      })

    expect(() => service.storeImage(pngBytes)).toThrow(
      'simulated catalog interruption'
    )
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM assets')
        .get()
    ).toEqual({ count: 0 })

    interruptedUpsert.mockRestore()

    const reference = service.storeImage(pngBytes)

    expect(service.readAsset(reference.assetId).buffer).toEqual(pngBytes)
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM assets')
        .get()
    ).toEqual({ count: 1 })
  })
})
