import { BadRequestException } from '@nestjs/common'
import { Workbook } from 'exceljs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { ExportImportController } from '../../../src/modules/export-import/export-import.controller'
import { ExportImportService } from '../../../src/modules/export-import/export-import.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { NotesService } from '../../../src/modules/notes/notes.service'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'

let databaseService: DatabaseService
let settingsService: SettingsService
let notesService: NotesService
let exportImportController: ExportImportController

const getDefaultNoteTypeId = (): string =>
  settingsService.getDefaultNoteType().id

const createImportFile = (
  content: string,
  mimeType = 'application/json',
  originalName = 'import.json'
) => {
  return {
    buffer: Buffer.from(content, 'utf-8'),
    mimetype: mimeType,
    originalname: originalName,
  }
}

const createSpreadsheetImportFile = async () => {
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet('Import')

  worksheet.addRow(['sourceUrl'])
  worksheet.addRow(['https://example.com'])

  const buffer = await workbook.xlsx.writeBuffer()

  return {
    buffer: Buffer.from(buffer),
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    originalname: 'import.xlsx',
  }
}

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()

  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService)
  )
  settingsService.onModuleInit()
  notesService = new NotesService(
    new NotesRepository(databaseService),
    settingsService
  )
  exportImportController = new ExportImportController(
    new ExportImportService(databaseService, settingsService, notesService)
  )
})

afterEach(() => {
  databaseService.close()
})

describe(ExportImportController.name, () => {
  it('exports and imports Phase 7 JSON data through the API surface', async () => {
    const books = settingsService.createNoteType({ title: 'Books' })
    const sourceColumn = settingsService.createColumn(books.id, {
      name: 'sourceUrl',
      title: 'Source URL',
      type: ColumnTypeEnum.Link,
    })
    notesService.createNote({
      noteTypeId: books.id,
      values: { [sourceColumn.id]: 'https://example.com' },
    })

    const exportedData = exportImportController.exportData()
    const result = await exportImportController.importData(
      createImportFile(JSON.stringify(exportedData))
    )

    expect(exportedData.version).toBe(2)
    expect(exportedData.noteTypes.map((noteType) => noteType.title)).toContain(
      'Books'
    )
    expect(result).toEqual({
      importedColumns: exportedData.columns.length,
      importedNotes: 1,
      unmatchedFields: [],
      updatedGeneralSettings: true,
    })
    expect(notesService.listNotes()).toHaveLength(2)
  })

  it('imports xlsx files through the API surface when a target note type is supplied', async () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })
    const sourceColumn = settingsService.createColumn(recipes.id, {
      name: 'sourceUrl',
      title: 'Source URL',
      type: ColumnTypeEnum.Link,
    })

    const result = await exportImportController.importData(
      await createSpreadsheetImportFile(),
      {
        targetNoteTypeId: recipes.id,
      }
    )
    const notes = notesService.listNotes()

    expect(result).toEqual({
      importedColumns: 1,
      importedNotes: 1,
      unmatchedFields: [],
      updatedGeneralSettings: false,
    })
    expect(notes).toHaveLength(1)
    expect(notes[0].values).toEqual({
      [sourceColumn.id]: 'https://example.com',
    })
  })

  it('rejects xlsx imports that do not include a target note type selection', async () => {
    await expect(
      exportImportController.importData(await createSpreadsheetImportFile())
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects invalid import files before calling the service', async () => {
    await expect(() =>
      exportImportController.importData(undefined)
    ).rejects.toThrow(BadRequestException)
    await expect(() =>
      exportImportController.importData(createImportFile('{not-json'))
    ).rejects.toThrow(BadRequestException)
    await expect(() =>
      exportImportController.importData(
        createImportFile('{"version":2}', 'text/plain', 'import.txt')
      )
    ).rejects.toThrow(BadRequestException)
  })
})
