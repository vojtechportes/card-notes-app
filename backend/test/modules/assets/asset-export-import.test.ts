import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Workbook } from 'exceljs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AssetsRepository } from '../../../src/modules/assets/assets.repository'
import { AssetsService } from '../../../src/modules/assets/assets.service'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { ExportImportService } from '../../../src/modules/export-import/export-import.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { NotesService } from '../../../src/modules/notes/notes.service'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP2S8QAAAABJRU5ErkJggg=='

describe('managed asset export and import', () => {
  let dataRoot: string
  let databaseService: DatabaseService
  let exportImportService: ExportImportService
  let notesService: NotesService
  let settingsService: SettingsService

  beforeEach(() => {
    dataRoot = mkdtempSync(join(tmpdir(), 'notestack-asset-roundtrip-'))
    process.env.CARD_NOTES_DATA_ROOT = dataRoot
    databaseService = new DatabaseService({
      filePath: join(dataRoot, 'card-notes.sqlite'),
    })
    databaseService.initialize()

    settingsService = new SettingsService(
      new ColumnsRepository(databaseService),
      new GeneralSettingsRepository(databaseService)
    )
    settingsService.onModuleInit()

    const assetsService = new AssetsService(
      new AssetsRepository(databaseService)
    )
    notesService = new NotesService(
      new NotesRepository(databaseService),
      settingsService,
      undefined,
      assetsService
    )
    exportImportService = new ExportImportService(
      databaseService,
      settingsService,
      notesService,
      assetsService
    )
  })

  afterEach(() => {
    databaseService.close()
    delete process.env.CARD_NOTES_DATA_ROOT
    rmSync(dataRoot, { force: true, recursive: true })
  })

  it('materializes portable JSON and rehydrates byte-identical deduplicated assets', () => {
    const noteType = settingsService.getDefaultNoteType()
    const imageColumn = settingsService.createColumn(noteType.id, {
      name: 'receipt',
      title: 'Receipt',
      type: ColumnTypeEnum.Image,
    })

    const created = notesService.createNote({
      noteTypeId: noteType.id,
      values: {
        [imageColumn.id]: {
          dataUrl: pngDataUrl,
          fileName: 'receipt.png',
          mimeType: 'image/png',
        },
      },
    })
    const storedReference = created.values[imageColumn.id] as {
      assetId: string
      dataUrl?: string
      path?: string
    }

    expect(storedReference.assetId).toMatch(/^[a-f0-9]{64}$/)
    expect(storedReference.dataUrl).toBeUndefined()
    expect(storedReference.path).toBeUndefined()

    const exported = exportImportService.exportData()
    const exportedImage = exported.notes[0].values[imageColumn.id] as {
      assetId?: string
      dataUrl: string
      path?: string
    }

    expect(exportedImage.dataUrl).toBe(pngDataUrl)
    expect(exportedImage.assetId).toBeUndefined()
    expect(exportedImage.path).toBeUndefined()

    exportImportService.importData(exported)

    const notes = notesService.listNotes()
    const importedReference = notes[1].values[imageColumn.id] as {
      assetId: string
    }

    expect(importedReference.assetId).toBe(storedReference.assetId)
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM assets')
        .get()
    ).toEqual({ count: 1 })
  })

  it('stores embedded XLSX images before committing note references', async () => {
    const noteType = settingsService.getDefaultNoteType()
    const imageColumn = settingsService.createColumn(noteType.id, {
      name: 'receipt',
      title: 'Receipt',
      type: ColumnTypeEnum.Image,
    })
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Import')
    const imageId = workbook.addImage({
      base64: pngDataUrl.slice(pngDataUrl.indexOf(',') + 1),
      extension: 'png',
    })

    worksheet.addRow(['receipt'])
    worksheet.addRow([''])
    worksheet.addImage(imageId, {
      ext: { height: 16, width: 16 },
      tl: { col: 0, row: 1 },
    })

    const workbookBuffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const result = await exportImportService.importSpreadsheetData(
      workbookBuffer,
      noteType.id
    )
    const value = notesService.listNotes()[0].values[imageColumn.id] as {
      assetId: string
      dataUrl?: string
    }

    expect(result.importedNotes).toBe(1)
    expect(value.assetId).toMatch(/^[a-f0-9]{64}$/)
    expect(value.dataUrl).toBeUndefined()
  })
})
