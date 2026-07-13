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

const getDefaultNoteTypeId = (): string =>
  settingsService.getDefaultNoteType().id

const createSpreadsheetBuffer = async (
  configure: (workbook: Workbook) => void
): Promise<Buffer> => {
  const workbook = new Workbook()

  configure(workbook)

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
}

const addPngImage = (
  workbook: Workbook,
  worksheet: Workbook['worksheets'][number],
  columnIndex: number,
  rowIndex: number,
  base64: string
): void => {
  const imageId = workbook.addImage({
    base64,
    extension: 'png',
  })

  worksheet.addImage(imageId, {
    ext: { height: 16, width: 16 },
    tl: { col: columnIndex, row: rowIndex },
  })
}
const createServices = () => {
  const sourceDatabaseService = new DatabaseService({ filePath: ':memory:' })

  sourceDatabaseService.initialize()

  const sourceSettingsService = new SettingsService(
    new ColumnsRepository(sourceDatabaseService),
    new GeneralSettingsRepository(sourceDatabaseService)
  )

  sourceSettingsService.onModuleInit()

  const sourceNotesService = new NotesService(
    new NotesRepository(sourceDatabaseService),
    sourceSettingsService
  )

  const sourceExportImportService = new ExportImportService(
    sourceDatabaseService,
    sourceSettingsService,
    sourceNotesService
  )

  return {
    sourceDatabaseService,
    sourceExportImportService,
    sourceNotesService,
    sourceSettingsService,
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
  it('exports a Phase 7 payload with note types, scoped columns, settings, and notes', () => {
    const books = settingsService.createNoteType({ title: 'Books' })
    const defaultSummaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const booksAuthorColumn = settingsService.createColumn(books.id, {
      name: 'author',
      title: 'Author',
      type: ColumnTypeEnum.Text,
    })

    settingsService.updateGeneralSettings({
      textTruncationLength: 80,
      cardFieldDisplayCount: 2,
      mergeDateTimeFields: true,
    })

    notesService.createNote({
      noteTypeId: getDefaultNoteTypeId(),
      values: { [defaultSummaryColumn.id]: 'Default note' },
    })
    notesService.createNote({
      noteTypeId: books.id,
      values: { [booksAuthorColumn.id]: 'Octavia Butler' },
    })

    const exportedData = exportImportService.exportData()

    expect(exportedData.version).toBe(2)
    expect(
      exportedData.noteTypes.map((noteType) => noteType.title).sort()
    ).toEqual(['Books', 'Default'])
    expect(
      exportedData.columns.every((column) => Boolean(column.noteTypeId))
    ).toBe(true)
    expect(exportedData.notes).toHaveLength(2)
    expect(exportedData.notes.map((note) => note.noteTypeId)).toContain(
      books.id
    )
    expect(exportedData.generalSettings).toEqual({
      textTruncationLength: 80,
      cardFieldDisplayCount: 2,
      mergeDateTimeFields: true,
    })
  })

  it('imports JSON while preserving note type relationships when no target type is selected', () => {
    const {
      sourceDatabaseService,
      sourceExportImportService,
      sourceNotesService,
      sourceSettingsService,
    } = createServices()

    try {
      const books = sourceSettingsService.createNoteType({ title: 'Books' })
      const defaultSummaryColumn = sourceSettingsService.createColumn({
        name: 'summary',
        title: 'Summary',
        type: ColumnTypeEnum.Text,
      })
      const booksAuthorColumn = sourceSettingsService.createColumn(books.id, {
        name: 'author',
        title: 'Author',
        type: ColumnTypeEnum.Text,
      })

      sourceNotesService.createNote({
        noteTypeId: sourceSettingsService.getDefaultNoteType().id,
        values: { [defaultSummaryColumn.id]: 'Default export note' },
      })
      sourceNotesService.createNote({
        noteTypeId: books.id,
        values: { [booksAuthorColumn.id]: 'N. K. Jemisin' },
      })

      const exportData = sourceExportImportService.exportData()
      const result = exportImportService.importData(exportData)
      const importedBooksType = settingsService
        .listNoteTypes()
        .find((noteType) => noteType.title === 'Books')
      const importedBooksAuthorColumn = importedBooksType
        ? settingsService
            .listColumns(importedBooksType.id)
            .find((column) => column.name === 'author')
        : undefined

      expect(result).toEqual({
        importedColumns: exportData.columns.length,
        importedNotes: 2,
        unmatchedFields: [],
        updatedGeneralSettings: true,
      })
      expect(importedBooksType).toBeDefined()
      expect(importedBooksAuthorColumn).toBeDefined()
      expect(
        notesService
          .listNotes()
          .some((note) => note.noteTypeId === importedBooksType?.id)
      ).toBe(true)
      expect(
        notesService
          .listNotes()
          .some(
            (note) =>
              importedBooksAuthorColumn &&
              note.values[importedBooksAuthorColumn.id] === 'N. K. Jemisin'
          )
      ).toBe(true)
    } finally {
      sourceDatabaseService.close()
    }
  })

  it('imports JSON into a selected target note type and reports unmatched fields', () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })
    const recipeSummaryColumn = settingsService.createColumn(recipes.id, {
      name: 'summary',
      title: 'Recipe summary',
      type: ColumnTypeEnum.Link,
    })

    const {
      sourceDatabaseService,
      sourceExportImportService,
      sourceNotesService,
      sourceSettingsService,
    } = createServices()

    try {
      const books = sourceSettingsService.createNoteType({ title: 'Books' })
      const booksSummaryColumn = sourceSettingsService.createColumn(books.id, {
        name: 'summary',
        title: 'Summary',
        type: ColumnTypeEnum.Text,
      })
      const booksRatingColumn = sourceSettingsService.createColumn(books.id, {
        name: 'rating',
        title: 'Rating',
        type: ColumnTypeEnum.Number,
      })

      sourceNotesService.createNote({
        noteTypeId: books.id,
        values: {
          [booksSummaryColumn.id]: 'https://example.com/book',
          [booksRatingColumn.id]: 5,
        },
      })

      const exportData = sourceExportImportService.exportData()
      const result = exportImportService.importData(exportData, {
        targetNoteTypeId: recipes.id,
      })
      const importedRecipeNotes = notesService
        .listNotes()
        .filter((note) => note.noteTypeId === recipes.id)

      expect(result.importedNotes).toBe(1)
      expect(result.importedColumns).toBeGreaterThanOrEqual(1)
      expect(result.unmatchedFields).toEqual([
        {
          name: 'rating',
          noteTypeTitle: 'Books',
          title: 'Rating',
          type: ColumnTypeEnum.Number,
        },
      ])
      expect(importedRecipeNotes).toHaveLength(1)
      expect(importedRecipeNotes[0].values).toEqual({
        [recipeSummaryColumn.id]: 'https://example.com/book',
      })
    } finally {
      sourceDatabaseService.close()
    }
  })

  it('imports xlsx rows into the selected target note type and reports unmatched headers', async () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })
    const recipeTitleColumn = settingsService.createColumn(recipes.id, {
      name: 'title',
      title: 'Title',
      type: ColumnTypeEnum.Text,
    })
    const spreadsheetBuffer = await createSpreadsheetBuffer((workbook) => {
      const worksheet = workbook.addWorksheet('Import')

      worksheet.addRow(['title', 'missingHeader'])
      worksheet.addRow(['Imported title', 'Ignored'])
    })

    const result = await exportImportService.importSpreadsheetData(
      spreadsheetBuffer,
      recipes.id
    )
    const importedRecipeNotes = notesService
      .listNotes()
      .filter((note) => note.noteTypeId === recipes.id)

    expect(result).toEqual({
      importedColumns: 1,
      importedNotes: 1,
      unmatchedFields: [
        {
          name: 'missingHeader',
          noteTypeTitle: null,
          title: null,
          type: null,
        },
      ],
      updatedGeneralSettings: false,
    })
    expect(importedRecipeNotes).toHaveLength(1)
    expect(importedRecipeNotes[0].values).toEqual({
      [recipeTitleColumn.id]: 'Imported title',
    })
  })

  it('imports duplicate xlsx image headers into multi-image fields in sheet order', async () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })
    const printscreenColumn = settingsService.createColumn(recipes.id, {
      config: { isMultiImage: true },
      name: 'printscreen',
      title: 'Printscreen',
      type: ColumnTypeEnum.Image,
    })
    const firstImage =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
    const secondImage =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AABQMBgK7nXwAAAABJRU5ErkJggg=='
    const spreadsheetBuffer = await createSpreadsheetBuffer((workbook) => {
      const worksheet = workbook.addWorksheet('Import')

      worksheet.addRow(['printscreen', 'printscreen'])
      worksheet.addRow(['', ''])
      addPngImage(workbook, worksheet, 0, 1, firstImage)
      addPngImage(workbook, worksheet, 1, 1, secondImage)
    })

    const result = await exportImportService.importSpreadsheetData(
      spreadsheetBuffer,
      recipes.id
    )
    const importedRecipeNotes = notesService
      .listNotes()
      .filter((note) => note.noteTypeId === recipes.id)
    const importedImages = importedRecipeNotes[0].values[printscreenColumn.id]

    expect(result.importedNotes).toBe(1)
    expect(Array.isArray(importedImages)).toBe(true)
    expect(importedImages).toMatchObject([
      { dataUrl: expect.stringContaining(firstImage) },
      { dataUrl: expect.stringContaining(secondImage) },
    ])
  })

  it('imports only the first duplicate xlsx image header into single-image fields', async () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })
    const printscreenColumn = settingsService.createColumn(recipes.id, {
      name: 'printscreen',
      title: 'Printscreen',
      type: ColumnTypeEnum.Image,
    })
    const firstImage =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
    const secondImage =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AABQMBgK7nXwAAAABJRU5ErkJggg=='
    const spreadsheetBuffer = await createSpreadsheetBuffer((workbook) => {
      const worksheet = workbook.addWorksheet('Import')

      worksheet.addRow(['printscreen', 'printscreen'])
      worksheet.addRow(['', ''])
      addPngImage(workbook, worksheet, 0, 1, firstImage)
      addPngImage(workbook, worksheet, 1, 1, secondImage)
    })

    await exportImportService.importSpreadsheetData(
      spreadsheetBuffer,
      recipes.id
    )

    const importedRecipeNotes = notesService
      .listNotes()
      .filter((note) => note.noteTypeId === recipes.id)
    const importedImage = importedRecipeNotes[0].values[printscreenColumn.id]

    expect(Array.isArray(importedImage)).toBe(false)
    expect(importedImage).toMatchObject({
      dataUrl: expect.stringContaining(firstImage),
    })
  })

  it('skips targeted JSON notes when none of their fields match the selected target note type', () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })

    const {
      sourceDatabaseService,
      sourceExportImportService,
      sourceNotesService,
      sourceSettingsService,
    } = createServices()

    try {
      const books = sourceSettingsService.createNoteType({ title: 'Books' })
      const booksRatingColumn = sourceSettingsService.createColumn(books.id, {
        name: 'rating',
        title: 'Rating',
        type: ColumnTypeEnum.Number,
      })

      sourceNotesService.createNote({
        noteTypeId: books.id,
        values: {
          [booksRatingColumn.id]: 5,
        },
      })

      const exportData = sourceExportImportService.exportData()
      const result = exportImportService.importData(exportData, {
        targetNoteTypeId: recipes.id,
      })

      expect(result).toEqual({
        importedColumns: 4,
        importedNotes: 0,
        unmatchedFields: [
          {
            name: 'rating',
            noteTypeTitle: 'Books',
            title: 'Rating',
            type: ColumnTypeEnum.Number,
          },
        ],
        updatedGeneralSettings: true,
      })
      expect(notesService.listNotes()).toEqual([])
    } finally {
      sourceDatabaseService.close()
    }
  })
  it('round-trips exported data while preserving note type relationships', () => {
    const {
      sourceDatabaseService,
      sourceExportImportService,
      sourceNotesService,
      sourceSettingsService,
    } = createServices()

    try {
      const books = sourceSettingsService.createNoteType({ title: 'Books' })
      const booksAuthorColumn = sourceSettingsService.createColumn(books.id, {
        name: 'author',
        title: 'Author',
        type: ColumnTypeEnum.Text,
      })

      sourceNotesService.createNote({
        noteTypeId: books.id,
        values: {
          [booksAuthorColumn.id]: 'Martha Wells',
        },
      })

      const firstExport = sourceExportImportService.exportData()
      const importResult = exportImportService.importData(firstExport)
      const secondExport = exportImportService.exportData()
      const importedBooks = secondExport.noteTypes.find(
        (noteType) => noteType.title === 'Books'
      )
      const importedAuthorColumn = secondExport.columns.find(
        (column) =>
          column.noteTypeId === importedBooks?.id && column.name === 'author'
      )
      const importedBookNote = secondExport.notes.find(
        (note) => note.noteTypeId === importedBooks?.id
      )

      expect(importResult.importedNotes).toBe(1)
      expect(importedBooks).toBeDefined()
      expect(importedAuthorColumn).toBeDefined()
      expect(importedBookNote?.values).toEqual({
        [importedAuthorColumn?.id ?? 'missing-column']: 'Martha Wells',
      })
    } finally {
      sourceDatabaseService.close()
    }
  })

  it('imports into a selected target note type without deleting existing notes', () => {
    const recipes = settingsService.createNoteType({ title: 'Recipes' })
    const recipeTitleColumn = settingsService.createColumn(recipes.id, {
      name: 'title',
      title: 'Recipe title',
      type: ColumnTypeEnum.Text,
    })
    const existingNote = notesService.createNote({
      noteTypeId: recipes.id,
      values: {
        [recipeTitleColumn.id]: 'Existing recipe',
      },
    })

    const {
      sourceDatabaseService,
      sourceExportImportService,
      sourceNotesService,
      sourceSettingsService,
    } = createServices()

    try {
      const books = sourceSettingsService.createNoteType({ title: 'Books' })
      const booksTitleColumn = sourceSettingsService.createColumn(books.id, {
        name: 'title',
        title: 'Title',
        type: ColumnTypeEnum.Text,
      })

      sourceNotesService.createNote({
        noteTypeId: books.id,
        values: {
          [booksTitleColumn.id]: 'Imported title',
        },
      })

      const exportData = sourceExportImportService.exportData()
      const result = exportImportService.importData(exportData, {
        targetNoteTypeId: recipes.id,
      })
      const recipeNotes = notesService
        .listNotes()
        .filter((note) => note.noteTypeId === recipes.id)

      expect(result.importedNotes).toBe(1)
      expect(recipeNotes).toHaveLength(2)
      expect(recipeNotes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: existingNote.id,
            values: {
              [recipeTitleColumn.id]: 'Existing recipe',
            },
          }),
          expect.objectContaining({
            values: {
              [recipeTitleColumn.id]: 'Imported title',
            },
          }),
        ])
      )
    } finally {
      sourceDatabaseService.close()
    }
  })
  it('rejects malformed or legacy import payloads', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    notesService.createNote({
      noteTypeId: getDefaultNoteTypeId(),
      values: { [summaryColumn.id]: 'Existing note' },
    })

    const exportedData = exportImportService.exportData()

    expect(() => exportImportService.importData(null)).toThrow(
      BadRequestException
    )
    expect(() =>
      exportImportService.importData({ ...exportedData, version: 1 })
    ).toThrow(BadRequestException)
    expect(() =>
      exportImportService.importData({
        ...exportedData,
        noteTypes: {},
      })
    ).toThrow(BadRequestException)
    expect(() =>
      exportImportService.importData({
        ...exportedData,
        notes: [
          {
            ...exportedData.notes[0],
            noteTypeId: '',
          },
        ],
      })
    ).toThrow(BadRequestException)
  })
})
