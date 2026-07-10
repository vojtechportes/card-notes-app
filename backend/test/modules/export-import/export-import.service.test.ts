import { BadRequestException } from '@nestjs/common'
import { Workbook } from 'exceljs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
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
let exportImportService: ExportImportService

const singlePixelPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8nQAAAABJRU5ErkJggg==',
  'base64'
)

const createSpreadsheetBuffer = async (
  configure: (workbook: Workbook) => void
): Promise<Buffer> => {
  const workbook = new Workbook()

  configure(workbook)

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
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
  exportImportService = new ExportImportService(
    databaseService,
    settingsService,
    notesService
  )
})

afterEach(() => {
  databaseService.close()
})

describe(ExportImportService.name, () => {
  it('exports default columns, general settings, and notes in a versioned payload', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    settingsService.updateGeneralSettings({
      textTruncationLength: 120,
      cardFieldDisplayCount: 3,
      mergeDateTimeFields: true,
    })
    const note = notesService.createNote({
      values: { [summaryColumn.id]: 'Export me' },
    })

    const exportedData = exportImportService.exportData()

    expect(exportedData.version).toBe(1)
    expect(Date.parse(exportedData.exportedAt)).not.toBeNaN()
    expect(exportedData.columns.map((column) => column.name)).toEqual([
      'createdAt',
      'updatedAt',
      'summary',
    ])
    expect(exportedData.generalSettings).toEqual({
      textTruncationLength: 120,
      cardFieldDisplayCount: 3,
      mergeDateTimeFields: true,
    })
    expect(exportedData.notes).toEqual([note])
  })

  it('imports by matching columns by name, applying settings, and appending notes with fresh ids', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    settingsService.updateGeneralSettings({
      textTruncationLength: 80,
      cardFieldDisplayCount: 2,
      mergeDateTimeFields: true,
    })
    const originalNote = notesService.createNote({
      values: { [summaryColumn.id]: 'Original note' },
    })
    const exportedData = exportImportService.exportData()

    settingsService.updateGeneralSettings({
      textTruncationLength: null,
      cardFieldDisplayCount: null,
      mergeDateTimeFields: null,
    })
    const existingNote = notesService.createNote({
      values: { [summaryColumn.id]: 'Existing note' },
    })

    const result = exportImportService.importData(exportedData)
    const notes = notesService.listNotes()

    expect(result).toEqual({
      importedColumns: 3,
      importedNotes: 1,
      updatedGeneralSettings: true,
    })
    expect(settingsService.getGeneralSettings()).toEqual({
      textTruncationLength: 80,
      cardFieldDisplayCount: 2,
      mergeDateTimeFields: true,
    })
    expect(settingsService.listColumns().map((column) => column.name)).toEqual([
      'createdAt',
      'updatedAt',
      'summary',
    ])
    expect(notes).toHaveLength(3)
    expect(notes.filter((note) => note.id === originalNote.id)).toHaveLength(1)
    expect(notes.map((note) => note.id)).toContain(existingNote.id)
    expect(
      notes.filter((note) => note.values[summaryColumn.id] === 'Original note')
    ).toHaveLength(2)
  })

  it('creates fresh column and note ids for imported data whose column names do not already exist', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const sourceNote = notesService.createNote({
      values: { [summaryColumn.id]: 'Fresh import value' },
    })
    const exportedData = exportImportService.exportData()

    const secondDatabaseService = new DatabaseService({ filePath: ':memory:' })
    secondDatabaseService.initialize()
    const secondSettingsService = new SettingsService(
      new ColumnsRepository(secondDatabaseService),
      new GeneralSettingsRepository(secondDatabaseService)
    )
    secondSettingsService.onModuleInit()
    const secondNotesService = new NotesService(
      new NotesRepository(secondDatabaseService),
      secondSettingsService
    )
    const secondExportImportService = new ExportImportService(
      secondDatabaseService,
      secondSettingsService,
      secondNotesService
    )

    try {
      secondExportImportService.importData(exportedData)

      const importedSummaryColumn = secondSettingsService
        .listColumns()
        .find((column) => column.name === 'summary')
      const importedNote = secondNotesService.listNotes()[0]

      expect(importedSummaryColumn).toBeDefined()
      expect(importedSummaryColumn?.id).not.toBe(summaryColumn.id)
      expect(importedNote.id).not.toBe(sourceNote.id)
      expect(importedNote.values).toEqual({
        [importedSummaryColumn?.id as string]: 'Fresh import value',
      })
    } finally {
      secondDatabaseService.close()
    }
  })

  it('remaps imported note values to an existing compatible column with the same name', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const exportedData = exportImportService.exportData()
    const importedSummaryColumn = exportedData.columns.find(
      (column) => column.name === 'summary'
    )

    if (!importedSummaryColumn) {
      throw new Error('Expected exported summary column.')
    }

    const secondDatabaseService = new DatabaseService({ filePath: ':memory:' })
    secondDatabaseService.initialize()
    const secondSettingsService = new SettingsService(
      new ColumnsRepository(secondDatabaseService),
      new GeneralSettingsRepository(secondDatabaseService)
    )
    secondSettingsService.onModuleInit()
    const secondNotesService = new NotesService(
      new NotesRepository(secondDatabaseService),
      secondSettingsService
    )
    const secondExportImportService = new ExportImportService(
      secondDatabaseService,
      secondSettingsService,
      secondNotesService
    )
    const existingSummaryColumn = secondSettingsService.createColumn({
      name: 'summary',
      title: 'Existing Summary',
      type: ColumnTypeEnum.Text,
    })

    try {
      secondExportImportService.importData({
        ...exportedData,
        notes: [
          {
            id: 'imported-note',
            createdAt: '2026-07-07T10:00:00.000Z',
            updatedAt: '2026-07-07T10:00:00.000Z',
            values: { [summaryColumn.id]: 'Remapped value' },
          },
        ],
      })

      expect(secondNotesService.listNotes()[0].values).toEqual({
        [existingSummaryColumn.id]: 'Remapped value',
      })
      expect(
        secondSettingsService
          .listColumns()
          .filter((column) => column.name === 'summary')
      ).toHaveLength(1)
      expect(
        secondSettingsService
          .listColumns()
          .find((column) => column.id === importedSummaryColumn.id)
      ).toBeUndefined()
    } finally {
      secondDatabaseService.close()
    }
  })

  it('appends imported custom columns in payload order when some names already exist', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const ratingColumn = settingsService.createColumn({
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })
    const exportedData = exportImportService.exportData()

    const secondDatabaseService = new DatabaseService({ filePath: ':memory:' })
    secondDatabaseService.initialize()
    const secondSettingsService = new SettingsService(
      new ColumnsRepository(secondDatabaseService),
      new GeneralSettingsRepository(secondDatabaseService)
    )
    secondSettingsService.onModuleInit()
    const secondNotesService = new NotesService(
      new NotesRepository(secondDatabaseService),
      secondSettingsService
    )
    const secondExportImportService = new ExportImportService(
      secondDatabaseService,
      secondSettingsService,
      secondNotesService
    )
    const existingSummaryColumn = secondSettingsService.createColumn({
      name: 'summary',
      title: 'Existing Summary',
      type: ColumnTypeEnum.Text,
    })

    try {
      secondExportImportService.importData(exportedData)

      const importedColumns = secondSettingsService.listColumns()
      const importedSummaryColumn = importedColumns.find(
        (column) => column.name === 'summary'
      )
      const importedRatingColumn = importedColumns.find(
        (column) => column.name === 'rating'
      )

      expect(importedSummaryColumn?.id).toBe(existingSummaryColumn.id)
      expect(importedRatingColumn?.id).not.toBe(ratingColumn.id)
      expect(importedSummaryColumn?.sortOrder).toBe(3)
      expect(importedRatingColumn?.sortOrder).toBe(4)
      expect(
        new Set(importedColumns.map((column) => column.sortOrder)).size
      ).toBe(importedColumns.length)
    } finally {
      secondDatabaseService.close()
    }
  })

  it('preserves note values for columns that do not exist in the imported column config', () => {
    const exportedData = exportImportService.exportData()

    exportImportService.importData({
      ...exportedData,
      notes: [
        {
          id: 'first-orphan-note',
          createdAt: '2026-07-07T10:00:00.000Z',
          updatedAt: '2026-07-07T10:00:00.000Z',
          values: { deletedColumnId: 'First orphan value' },
        },
        {
          id: 'second-orphan-note',
          createdAt: '2026-07-07T11:00:00.000Z',
          updatedAt: '2026-07-07T11:00:00.000Z',
          values: { deletedColumnId: 'Second orphan value' },
        },
      ],
    })

    const notes = notesService.listNotes()
    const orphanColumnIds = notes.map((note) => Object.keys(note.values)[0])

    expect(notes.map((note) => Object.values(note.values)[0])).toEqual([
      'Second orphan value',
      'First orphan value',
    ])
    expect(orphanColumnIds[0]).toBe(orphanColumnIds[1])
    expect(orphanColumnIds[0]).not.toBe('deletedColumnId')
  })

  it('imports xlsx rows by matching existing columns, dropping unknown headers, and using system timestamps', async () => {
    const harmonyLinkColumn = settingsService.createColumn({
      name: 'harmonyLink',
      title: 'Harmony Link',
      type: ColumnTypeEnum.Link,
    })
    const titleColumn = settingsService.createColumn({
      name: 'title',
      title: 'Title',
      type: ColumnTypeEnum.Text,
    })
    const importStartedAt = Date.now()
    const spreadsheetBuffer = await createSpreadsheetBuffer((workbook) => {
      const worksheet = workbook.addWorksheet('Import')

      worksheet.addRow(['harmonyLink', 'title', 'missingColumn'])
      worksheet.addRow(['https://example.com', 'Imported title', 'Ignored'])
      worksheet.addRow(['', '', ''])
    })

    const result = await exportImportService.importSpreadsheetData(
      spreadsheetBuffer
    )
    const notes = notesService.listNotes()

    expect(result).toEqual({
      importedColumns: 2,
      importedNotes: 1,
      updatedGeneralSettings: false,
    })
    expect(notes).toHaveLength(1)
    expect(notes[0].values).toEqual({
      [harmonyLinkColumn.id]: 'https://example.com',
      [titleColumn.id]: 'Imported title',
    })
    expect(Date.parse(notes[0].createdAt)).not.toBeNaN()
    expect(Date.parse(notes[0].updatedAt)).not.toBeNaN()
    expect(notes[0].createdAt).toBe(notes[0].updatedAt)
    expect(new Date(notes[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      importStartedAt
    )
  })

  it('imports embedded worksheet images into image note values', async () => {
    const printscreenColumn = settingsService.createColumn({
      name: 'printscreen',
      title: 'Printscreen',
      type: ColumnTypeEnum.Image,
    })
    const spreadsheetBuffer = await createSpreadsheetBuffer((workbook) => {
      const worksheet = workbook.addWorksheet('Import')
      const imageId = workbook.addImage({
        buffer: singlePixelPngBuffer,
        extension: 'png',
      })

      worksheet.addRow(['printscreen'])
      worksheet.addRow([''])
      worksheet.addImage(imageId, 'A2:A2')
    })

    const result = await exportImportService.importSpreadsheetData(
      spreadsheetBuffer
    )
    const importedNote = notesService.listNotes()[0]
    const importedImage = importedNote.values[printscreenColumn.id]

    expect(result).toEqual({
      importedColumns: 1,
      importedNotes: 1,
      updatedGeneralSettings: false,
    })
    expect(importedImage).toMatchObject({
      dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      fileName: 'image1.png',
      mimeType: 'image/png',
      size: singlePixelPngBuffer.length,
    })
  })

  it('rejects malformed payloads before importing data', () => {
    const exportedData = exportImportService.exportData()

    expect(() => exportImportService.importData(null)).toThrow(
      BadRequestException
    )
    expect(() =>
      exportImportService.importData({ ...exportedData, version: 2 })
    ).toThrow(BadRequestException)
    expect(() =>
      exportImportService.importData({ ...exportedData, columns: [] })
    ).not.toThrow()
    expect(() =>
      exportImportService.importData({
        ...exportedData,
        generalSettings: {
          textTruncationLength: 0,
          cardFieldDisplayCount: null,
          mergeDateTimeFields: null,
        },
      })
    ).toThrow(BadRequestException)
    expect(() =>
      exportImportService.importData({
        ...exportedData,
        columns: [
          ...exportedData.columns,
          {
            ...exportedData.columns[0],
          },
        ],
      })
    ).toThrow(BadRequestException)
  })

  it('preserves mergeDateTimeFields during import', () => {
    settingsService.updateGeneralSettings({
      mergeDateTimeFields: true,
    })
    const exportedData = exportImportService.exportData()

    settingsService.updateGeneralSettings({
      mergeDateTimeFields: null,
    })

    exportImportService.importData(exportedData)

    expect(settingsService.getGeneralSettings()).toEqual({
      textTruncationLength: null,
      cardFieldDisplayCount: null,
      mergeDateTimeFields: true,
    })
  })

  it('rolls back column and settings changes when import fails inside the transaction', () => {
    const [createdAtColumn] = settingsService.listColumns()
    const exportedData = exportImportService.exportData()
    const importOnlyColumn = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'importOnly',
      title: 'Import only',
      type: ColumnTypeEnum.Text,
      sortOrder: 4,
      isHidden: false,
      isDefault: false,
      config: null,
      createdAt: '2026-07-07T10:00:00.000Z',
      updatedAt: '2026-07-07T10:00:00.000Z',
    }

    expect(() =>
      exportImportService.importData({
        ...exportedData,
        columns: [importOnlyColumn],
        generalSettings: {
          textTruncationLength: 50,
          cardFieldDisplayCount: 2,
          mergeDateTimeFields: false,
        },
        notes: [
          {
            id: 'imported-note',
            createdAt: '2026-07-07T10:00:00.000Z',
            updatedAt: '2026-07-07T10:00:00.000Z',
            values: { [createdAtColumn.id]: '2026-07-07T10:00:00.000Z' },
          },
        ],
      })
    ).toThrow(BadRequestException)

    expect(
      settingsService
        .listColumns()
        .some((column) => column.name === 'importOnly')
    ).toBe(false)
    expect(settingsService.getGeneralSettings()).toEqual({
      textTruncationLength: null,
      cardFieldDisplayCount: null,
      mergeDateTimeFields: null,
    })
    expect(notesService.listNotes()).toEqual([])
  })
})

