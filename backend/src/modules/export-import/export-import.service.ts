import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { Workbook } from 'exceljs'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import { NotesService } from '../notes/notes.service'
import { NoteSortDirectionEnum } from '../notes/types/note-sort-direction-enum'
import { NoteSortFieldEnum } from '../notes/types/note-sort-field-enum'
import type { Note } from '../notes/types/note'
import type {
  NoteImageValue,
  NoteValue,
  NoteValues,
} from '../notes/types/note-value'
import { SettingsService } from '../settings/settings.service'
import { ColumnTypeEnum } from '../settings/types/column-type-enum'
import type { GeneralSettings } from '../settings/types/general-settings'
import type { NoteColumn } from '../settings/types/note-column'
import { ExportImportDataDto } from './types/export-import-data.dto'
import { ImportResultDto } from './types/import-result.dto'

const exportDataVersion = 1

interface ValidExportImportData {
  version: number
  exportedAt: string
  columns: NoteColumn[]
  generalSettings: GeneralSettings
  notes: Note[]
}

interface ColumnImportMapping {
  sourceColumnNamesById: Map<string, string>
  targetColumnIdsByName: Map<string, string>
}

interface ResolvedSpreadsheetImport {
  mappedColumnCount: number
  rows: NoteValues[]
}

interface SpreadsheetWorkbookMedia {
  type?: string
  extension?: string
  name?: string
  buffer?: Buffer
}

@Injectable()
export class ExportImportService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
    @Inject(NotesService)
    private readonly notesService: NotesService
  ) {}

  exportData(): ExportImportDataDto {
    const noteTypes = this.settingsService.listNoteTypes()

    if (noteTypes.length > 1) {
      throw new BadRequestException(
        'Export supports only the default note type until Phase 7 export/import is implemented.'
      )
    }

    return {
      version: exportDataVersion,
      exportedAt: new Date().toISOString(),
      columns: this.settingsService.listColumns(),
      generalSettings: this.settingsService.getGeneralSettings(),
      notes: this.notesService.listNotes({
        sortBy: NoteSortFieldEnum.CreatedAt,
        sortDirection: NoteSortDirectionEnum.Asc,
      }),
    }
  }

  importData(payload: unknown): ImportResultDto {
    const data = this.resolveImportPayload(payload)
    const database = this.getDatabase()
    const importPayload = database.transaction(
      (importData: ValidExportImportData): ImportResultDto => {
        const columnMapping = this.importColumnsWithFreshIds(importData.columns)

        this.settingsService.updateGeneralSettings(importData.generalSettings)
        this.appendNotesWithFreshIds(importData.notes, columnMapping)

        return {
          importedColumns: importData.columns.length,
          importedNotes: importData.notes.length,
          updatedGeneralSettings: true,
        }
      }
    )

    return importPayload(data)
  }

  async importSpreadsheetData(buffer: Buffer): Promise<ImportResultDto> {
    const spreadsheetImport = await this.resolveSpreadsheetImport(buffer)
    const database = this.getDatabase()
    const importRows = database.transaction(
      (rows: NoteValues[], mappedColumnCount: number): ImportResultDto => {
        let importedNotes = 0

        for (const values of rows) {
          if (Object.keys(values).length === 0) {
            continue
          }

          this.notesService.createNote({
            noteTypeId: this.settingsService.getDefaultNoteType().id,
            values,
          })
          importedNotes += 1
        }

        return {
          importedColumns: mappedColumnCount,
          importedNotes,
          updatedGeneralSettings: false,
        }
      }
    )

    return importRows(
      spreadsheetImport.rows,
      spreadsheetImport.mappedColumnCount
    )
  }

  private async resolveSpreadsheetImport(
    buffer: Buffer
  ): Promise<ResolvedSpreadsheetImport> {
    const workbook = new Workbook()

    try {
      const workbookBuffer = buffer as unknown as Parameters<(typeof workbook.xlsx)['load']>[0]
      await workbook.xlsx.load(workbookBuffer)
    } catch {
      throw new BadRequestException('Import file must contain a valid XLSX workbook.')
    }

    const worksheet = workbook.worksheets[0]

    if (!worksheet) {
      throw new BadRequestException('XLSX import file must contain at least one worksheet.')
    }

    const headerRow = worksheet.getRow(1)
    const columnIndexes = Array.from({ length: worksheet.columnCount }, (_, index) => index + 1)

    if (columnIndexes.length === 0) {
      throw new BadRequestException('XLSX import file must contain a header row.')
    }

    const existingColumnsByName = new Map(
      this.settingsService
        .listColumns()
        .filter((column) => !this.isSystemTimestampColumn(column))
        .map((column) => [column.name, column])
    )
    const mappedColumnsByIndex = new Map<number, NoteColumn>()
    const headerNames: string[] = []

    for (const columnIndex of columnIndexes) {
      const headerName = headerRow.getCell(columnIndex).text.trim()

      if (!headerName) {
        continue
      }

      headerNames.push(headerName)

      const existingColumn = existingColumnsByName.get(headerName)

      if (existingColumn) {
        mappedColumnsByIndex.set(columnIndex, existingColumn)
      }
    }

    this.ensureUniqueValues(
      headerNames,
      'XLSX header column names must be unique.'
    )

    const imagesByCellAddress = this.resolveWorksheetImages(worksheet, workbook)
    const rows: NoteValues[] = []

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber)
      const values: NoteValues = {}

      for (const [columnIndex, column] of mappedColumnsByIndex.entries()) {
        const cell = row.getCell(columnIndex)
        const imageValue = imagesByCellAddress.get(cell.address)
        const resolvedValue = this.resolveSpreadsheetCellValue(
          cell.value,
          cell.text,
          column,
          imageValue,
          Boolean(workbook.properties.date1904)
        )

        if (resolvedValue !== null) {
          values[column.id] = resolvedValue
        }
      }

      rows.push(values)
    }

    return {
      mappedColumnCount: mappedColumnsByIndex.size,
      rows,
    }
  }

  private resolveWorksheetImages(
    worksheet: Workbook['worksheets'][number],
    workbook: Workbook
  ): Map<string, NoteImageValue> {
    const imagesByCellAddress = new Map<string, NoteImageValue>()

    const workbookMedia = workbook.model.media as unknown as
      | SpreadsheetWorkbookMedia[]
      | undefined

    for (const image of worksheet.getImages()) {
      const mediaIndex = Number(image.imageId)
      const media = Number.isInteger(mediaIndex) ? workbookMedia?.[mediaIndex] : undefined
      const imageValue = this.resolveWorksheetImageValue(media)

      if (!imageValue) {
        continue
      }

      const columnNumber = image.range.tl.nativeCol + 1
      const rowNumber = image.range.tl.nativeRow + 1
      const cellAddress = worksheet.getCell(rowNumber, columnNumber).address

      if (!imagesByCellAddress.has(cellAddress)) {
        imagesByCellAddress.set(cellAddress, imageValue)
      }
    }

    return imagesByCellAddress
  }

  private resolveWorksheetImageValue(
    media: SpreadsheetWorkbookMedia | undefined
  ): NoteImageValue | null {
    if (
      !media ||
      media.type !== 'image' ||
      !media.extension ||
      !media.buffer?.length
    ) {
      return null
    }

    const mimeType = `image/${media.extension.toLowerCase()}`
    const fileName = media.name
      ? `${media.name}.${media.extension}`
      : `imported-image.${media.extension}`

    return {
      dataUrl: `data:${mimeType};base64,${media.buffer.toString('base64')}`,
      fileName,
      mimeType,
      size: media.buffer.length,
    }
  }

  private resolveSpreadsheetCellValue(
    rawCellValue: unknown,
    cellText: string,
    column: NoteColumn,
    imageValue: NoteImageValue | undefined,
    usesDate1904: boolean
  ): NoteValue | null {
    const value = this.unwrapSpreadsheetCellValue(rawCellValue, cellText)

    switch (column.type) {
      case ColumnTypeEnum.Text: {
        const textValue = this.resolveSpreadsheetTextValue(value, cellText)

        return textValue === '' ? null : textValue
      }
      case ColumnTypeEnum.Link: {
        const linkValue = this.resolveSpreadsheetLinkValue(value, cellText)

        return linkValue === '' ? null : linkValue
      }
      case ColumnTypeEnum.Number:
        return this.resolveSpreadsheetNumberValue(value, cellText)
      case ColumnTypeEnum.Date:
        return this.resolveSpreadsheetDateValue(value, cellText, usesDate1904)
      case ColumnTypeEnum.Image:
        return this.resolveSpreadsheetImageCellValue(value, imageValue)
      default:
        throw new BadRequestException('Column type is not supported.')
    }
  }

  private unwrapSpreadsheetCellValue(
    rawCellValue: unknown,
    cellText: string
  ): unknown {
    if (rawCellValue === undefined || rawCellValue === null) {
      return null
    }

    if (
      typeof rawCellValue === 'string' ||
      typeof rawCellValue === 'number' ||
      typeof rawCellValue === 'boolean' ||
      rawCellValue instanceof Date
    ) {
      return rawCellValue
    }

    if (typeof rawCellValue !== 'object' || Array.isArray(rawCellValue)) {
      return cellText.trim()
    }

    if ('result' in rawCellValue) {
      return this.unwrapSpreadsheetCellValue(
        (rawCellValue as { result?: unknown }).result,
        cellText
      )
    }

    if ('hyperlink' in rawCellValue) {
      return {
        hyperlink: (rawCellValue as { hyperlink?: unknown }).hyperlink,
        text: (rawCellValue as { text?: unknown }).text,
      }
    }

    if ('richText' in rawCellValue) {
      return cellText.trim()
    }

    return cellText.trim()
  }

  private resolveSpreadsheetTextValue(value: unknown, cellText: string): string {
    if (typeof value === 'string') {
      return value.trim()
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    return cellText.trim()
  }

  private resolveSpreadsheetLinkValue(value: unknown, cellText: string): string {
    if (
      value &&
      typeof value === 'object' &&
      'hyperlink' in value &&
      typeof (value as { hyperlink?: unknown }).hyperlink === 'string'
    ) {
      return (value as { hyperlink: string }).hyperlink.trim()
    }

    return this.resolveSpreadsheetTextValue(value, cellText)
  }

  private resolveSpreadsheetNumberValue(
    value: unknown,
    cellText: string
  ): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    const normalizedValue = cellText.trim()

    if (!normalizedValue) {
      return null
    }

    const numericValue = Number(normalizedValue)

    if (!Number.isFinite(numericValue)) {
      throw new BadRequestException('Number note values must be finite numbers.')
    }

    return numericValue
  }

  private resolveSpreadsheetDateValue(
    value: unknown,
    cellText: string,
    usesDate1904: boolean
  ): string | null {
    const resolvedDate = this.resolveDateFromSpreadsheetValue(
      value,
      cellText,
      usesDate1904
    )

    return resolvedDate ? resolvedDate.toISOString() : null
  }

  private resolveDateFromSpreadsheetValue(
    value: unknown,
    cellText: string,
    usesDate1904: boolean
  ): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return this.convertExcelSerialDateToUtc(value, usesDate1904)
    }

    const normalizedValue = cellText.trim()

    if (!normalizedValue) {
      return null
    }

    const parsedDate = new Date(normalizedValue)

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Date note values must be valid date strings.')
    }

    return parsedDate
  }

  private convertExcelSerialDateToUtc(
    serialValue: number,
    usesDate1904: boolean
  ): Date {
    const wholeDays = Math.floor(serialValue)
    const millisecondsFromTime = Math.round(
      (serialValue - wholeDays) * 24 * 60 * 60 * 1000
    )
    const baseDate = usesDate1904
      ? Date.UTC(1904, 0, 1)
      : Date.UTC(1899, 11, 30)

    return new Date(baseDate + wholeDays * 24 * 60 * 60 * 1000 + millisecondsFromTime)
  }

  private resolveSpreadsheetImageCellValue(
    value: unknown,
    imageValue: NoteImageValue | undefined
  ): NoteImageValue | null {
    if (imageValue) {
      return imageValue
    }

    if (typeof value !== 'string') {
      return null
    }

    const normalizedValue = value.trim()

    if (!normalizedValue) {
      return null
    }

    if (normalizedValue.startsWith('data:image/')) {
      return { dataUrl: normalizedValue }
    }

    if (/^https?:\/\//i.test(normalizedValue)) {
      return { url: normalizedValue }
    }

    return { path: normalizedValue }
  }

  private importColumnsWithFreshIds(
    columns: NoteColumn[]
  ): ColumnImportMapping {
    const sourceColumnNamesById = new Map(
      columns.map((column) => [column.id, column.name])
    )
    const targetColumnIdsByName = new Map<string, string>()
    const existingByName = new Map(
      this.settingsService.listColumns().map((column) => [column.name, column])
    )
    const defaultNoteTypeId = this.settingsService.getDefaultNoteType().id
    let nextSortOrder = this.getNextColumnSortOrder()

    for (const column of columns) {
      const existingColumn = existingByName.get(column.name)

      if (existingColumn) {
        this.ensureExistingColumnCanAcceptImport(existingColumn, column)

        if (this.isSystemTimestampColumn(existingColumn)) {
          this.updateImportedColumn(existingColumn, column)
        } else {
          this.updateImportedColumn(existingColumn, {
            ...column,
            noteTypeId: defaultNoteTypeId,
            sortOrder: nextSortOrder,
          })
          nextSortOrder += 1
        }

        targetColumnIdsByName.set(column.name, existingColumn.id)
        continue
      }

      if (column.isDefault) {
        throw new BadRequestException(
          'Imported default columns must match existing default columns.'
        )
      }

      const importedColumn = {
        ...column,
        id: uuidV4(),
        noteTypeId: defaultNoteTypeId,
        sortOrder: nextSortOrder,
        isDefault: false,
      }

      nextSortOrder += 1
      this.insertImportedColumn(importedColumn)
      targetColumnIdsByName.set(column.name, importedColumn.id)
      existingByName.set(column.name, importedColumn)
    }

    return { sourceColumnNamesById, targetColumnIdsByName }
  }

  private appendNotesWithFreshIds(
    notes: Note[],
    columnMapping: ColumnImportMapping
  ): void {
    const orphanColumnIdMap = new Map<string, string>()
    const defaultNoteTypeId = this.settingsService.getDefaultNoteType().id

    for (const note of notes) {
      const noteId = uuidV4()
      const values = this.resolveImportedNoteValues(
        note.values,
        columnMapping,
        orphanColumnIdMap
      )

      this.insertImportedNote(
        noteId,
        defaultNoteTypeId,
        values,
        note.createdAt,
        note.updatedAt
      )
    }
  }

  private resolveImportedNoteValues(
    values: NoteValues,
    columnMapping: ColumnImportMapping,
    orphanColumnIdMap: Map<string, string>
  ): NoteValues {
    const resolvedValues: NoteValues = {}
    const columnsById = new Map(
      this.settingsService.listColumns().map((column) => [column.id, column])
    )

    for (const [sourceColumnId, value] of Object.entries(values)) {
      const sourceColumnName =
        columnMapping.sourceColumnNamesById.get(sourceColumnId)
      const mappedColumnId = sourceColumnName
        ? columnMapping.targetColumnIdsByName.get(sourceColumnName)
        : undefined
      const targetColumnId =
        mappedColumnId ??
        this.resolveOrphanColumnId(
          sourceColumnId,
          columnsById,
          orphanColumnIdMap
        )
      const targetColumn = columnsById.get(targetColumnId)

      if (targetColumn) {
        if (this.isSystemTimestampColumn(targetColumn)) {
          throw new BadRequestException(
            'Imported note values cannot target system timestamp columns.'
          )
        }

        this.ensureValueMatchesColumnType(value, targetColumn)
      } else {
        this.ensureOrphanValueIsImportable(value)
      }

      resolvedValues[targetColumnId] = value
    }

    return resolvedValues
  }

  private resolveOrphanColumnId(
    sourceColumnId: string,
    columnsById: Map<string, NoteColumn>,
    orphanColumnIdMap: Map<string, string>
  ): string {
    const existingColumn = columnsById.get(sourceColumnId)

    if (existingColumn && this.isSystemTimestampColumn(existingColumn)) {
      return existingColumn.id
    }

    const existingOrphanColumnId = orphanColumnIdMap.get(sourceColumnId)

    if (existingOrphanColumnId) {
      return existingOrphanColumnId
    }

    const orphanColumnId = uuidV4()
    orphanColumnIdMap.set(sourceColumnId, orphanColumnId)

    return orphanColumnId
  }

  private resolveImportPayload(payload: unknown): ValidExportImportData {
    this.ensureRecord(payload, 'Import payload must be an object.')

    if (payload.version !== exportDataVersion) {
      throw new BadRequestException('Import payload version is not supported.')
    }

    this.ensureIsoDateString(payload.exportedAt, 'Export timestamp')

    if (!Array.isArray(payload.columns)) {
      throw new BadRequestException('Import payload columns must be an array.')
    }

    if (!Array.isArray(payload.notes)) {
      throw new BadRequestException('Import payload notes must be an array.')
    }

    const columns = payload.columns.map((column) =>
      this.resolveImportedColumn(column)
    )
    const notes = payload.notes.map((note) => this.resolveImportedNote(note))
    const generalSettings = this.resolveGeneralSettings(payload.generalSettings)

    this.ensureUniqueValues(
      columns.map((column) => column.id),
      'Imported column ids must be unique.'
    )
    this.ensureUniqueValues(
      columns.map((column) => column.name),
      'Imported column names must be unique.'
    )
    this.ensureUniqueValues(
      notes.map((note) => note.id),
      'Imported note ids must be unique.'
    )
    this.ensureNoteValuesMatchImport(columns, notes)

    return {
      version: payload.version,
      exportedAt: payload.exportedAt,
      columns,
      generalSettings,
      notes,
    }
  }

  private resolveImportedColumn(value: unknown): NoteColumn {
    this.ensureRecord(value, 'Imported column must be an object.')
    this.ensureRequiredString(value.id, 'Imported column id')
    this.ensureRequiredString(value.name, 'Imported column name')
    this.ensureRequiredString(value.title, 'Imported column title')
    this.ensureValidColumnType(value.type)
    this.ensureNonNegativeInteger(value.sortOrder, 'Imported column sort order')
    this.ensureRequiredBoolean(value.isHidden, 'Imported column hidden state')
    this.ensureRequiredBoolean(value.isDefault, 'Imported column default state')
    this.ensureRecordOrNull(value.config, 'Imported column config')
    this.ensureIsoDateString(
      value.createdAt,
      'Imported column created timestamp'
    )
    this.ensureIsoDateString(
      value.updatedAt,
      'Imported column updated timestamp'
    )

    return {
      id: value.id,
      noteTypeId:
        typeof value.noteTypeId === 'string' && value.noteTypeId.trim()
          ? value.noteTypeId
          : this.settingsService.getDefaultNoteType().id,
      name: value.name.trim(),
      title: value.title.trim(),
      type: value.type,
      sortOrder: value.sortOrder,
      isHidden: value.isHidden,
      isDefault: value.isDefault,
      config: value.config,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
  }

  private resolveImportedNote(value: unknown): Note {
    this.ensureRecord(value, 'Imported note must be an object.')
    this.ensureRequiredString(value.id, 'Imported note id')
    this.ensureIsoDateString(value.createdAt, 'Imported note created timestamp')
    this.ensureIsoDateString(value.updatedAt, 'Imported note updated timestamp')
    this.ensureRecord(
      value.values,
      'Imported note values must be an object keyed by column id.'
    )

    const values = Object.entries(value.values).reduce<NoteValues>(
      (result, [columnId, noteValue]) => {
        this.ensureRequiredString(columnId, 'Imported note value column id')
        this.ensureImportableNoteValue(noteValue)
        result[columnId] = noteValue

        return result
      },
      {}
    )

    return {
      id: value.id,
      noteTypeId:
        typeof value.noteTypeId === 'string' && value.noteTypeId.trim()
          ? value.noteTypeId
          : this.settingsService.getDefaultNoteType().id,
      values,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
  }

  private resolveGeneralSettings(value: unknown): GeneralSettings {
    this.ensureRecord(value, 'Imported general settings must be an object.')
    this.ensureOptionalPositiveIntegerOrNull(
      value.textTruncationLength,
      'Text truncation length'
    )
    this.ensureOptionalPositiveIntegerOrNull(
      value.cardFieldDisplayCount,
      'Card field display count'
    )
    this.ensureOptionalBooleanOrNull(
      value.mergeDateTimeFields,
      'Merge date and time fields'
    )

    if (
      value.textTruncationLength === undefined ||
      value.cardFieldDisplayCount === undefined ||
      value.mergeDateTimeFields === undefined
    ) {
      throw new BadRequestException(
        'Imported general settings must include all supported settings.'
      )
    }

    return {
      textTruncationLength: value.textTruncationLength,
      cardFieldDisplayCount: value.cardFieldDisplayCount,
      mergeDateTimeFields: value.mergeDateTimeFields,
    }
  }

  private ensureNoteValuesMatchImport(
    columns: NoteColumn[],
    notes: Note[]
  ): void {
    const columnsById = new Map(columns.map((column) => [column.id, column]))

    for (const note of notes) {
      for (const [columnId, value] of Object.entries(note.values)) {
        const column = columnsById.get(columnId)

        if (!column) {
          this.ensureOrphanValueIsImportable(value)
          continue
        }

        if (this.isSystemTimestampColumn(column)) {
          throw new BadRequestException(
            'Imported note values cannot target system timestamp columns.'
          )
        }

        this.ensureValueMatchesColumnType(value, column)
      }
    }
  }

  private ensureExistingColumnCanAcceptImport(
    existingColumn: NoteColumn,
    importedColumn: NoteColumn
  ): void {
    if (existingColumn.type !== importedColumn.type) {
      throw new BadRequestException(
        'Imported column type conflicts with an existing column.'
      )
    }

    if (
      this.isSystemTimestampColumn(existingColumn) &&
      !this.isImportedSystemDefaultColumn(importedColumn)
    ) {
      throw new BadRequestException(
        'Imported default column identity does not match the existing default column.'
      )
    }

    if (
      !this.isSystemTimestampColumn(existingColumn) &&
      importedColumn.isDefault
    ) {
      throw new BadRequestException(
        'Imported default columns must match existing default columns.'
      )
    }
  }

  private insertImportedColumn(column: NoteColumn): void {
    this.getDatabase()
      .prepare(
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
          config_json,
          created_at,
          updated_at
        ) VALUES (
          @id,
          @noteTypeId,
          @name,
          @title,
          @type,
          @sortOrder,
          @isHidden,
          @isDefault,
          @configJson,
          @createdAt,
          @updatedAt
        )
      `
      )
      .run({
        id: column.id,
        noteTypeId: column.noteTypeId,
        name: column.name,
        title: column.title,
        type: column.type,
        sortOrder: column.sortOrder,
        isHidden: column.isHidden ? 1 : 0,
        isDefault: column.isDefault ? 1 : 0,
        configJson: column.config ? JSON.stringify(column.config) : null,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
      })
  }

  private updateImportedColumn(
    existingColumn: NoteColumn,
    importedColumn: NoteColumn
  ): void {
    this.getDatabase()
      .prepare(
        `
        UPDATE note_columns
        SET title = @title,
            sort_order = @sortOrder,
            is_hidden = @isHidden,
            config_json = @configJson,
            updated_at = @updatedAt
        WHERE id = @id
      `
      )
      .run({
        id: existingColumn.id,
        title: importedColumn.title,
        sortOrder: importedColumn.sortOrder,
        isHidden: importedColumn.isHidden ? 1 : 0,
        configJson: importedColumn.config
          ? JSON.stringify(importedColumn.config)
          : null,
        updatedAt: importedColumn.updatedAt,
      })
  }

  private insertImportedNote(
    id: string,
    noteTypeId: string,
    values: NoteValues,
    createdAt: string,
    updatedAt: string
  ): void {
    const database = this.getDatabase()

    database
      .prepare(
        'INSERT INTO notes (id, note_type_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .run(id, noteTypeId, createdAt, updatedAt)

    const insertValue = database.prepare(`
      INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at)
      VALUES (@noteId, @columnId, @valueJson, @createdAt, @updatedAt)
    `)

    for (const [columnId, value] of Object.entries(values)) {
      insertValue.run({
        noteId: id,
        columnId,
        valueJson: JSON.stringify(value),
        createdAt,
        updatedAt,
      })
    }
  }

  private getNextColumnSortOrder(): number {
    const row = this.getDatabase()
      .prepare(
        'SELECT COALESCE(MAX(sort_order) + 1, 0) as sort_order FROM note_columns WHERE note_type_id = ?'
      )
      .get(this.settingsService.getDefaultNoteType().id) as
      | { sort_order: number }
      | undefined

    return row?.sort_order ?? 0
  }

  private ensureValueMatchesColumnType(
    value: NoteValue,
    column: NoteColumn
  ): void {
    switch (column.type) {
      case ColumnTypeEnum.Text:
      case ColumnTypeEnum.Link:
        if (typeof value !== 'string') {
          throw new BadRequestException(
            'Text and link note values must be strings.'
          )
        }
        return
      case ColumnTypeEnum.Date:
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          throw new BadRequestException(
            'Date note values must be valid date strings.'
          )
        }
        return
      case ColumnTypeEnum.Number:
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException(
            'Number note values must be finite numbers.'
          )
        }
        return
      case ColumnTypeEnum.Image:
        if (!this.isValidImageValue(value)) {
          throw new BadRequestException(
            'Image note values must be image metadata objects.'
          )
        }
        return
      default:
        throw new BadRequestException('Column type is not supported.')
    }
  }

  private ensureImportableNoteValue(
    value: unknown
  ): asserts value is NoteValue {
    if (typeof value === 'string') {
      return
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return
    }

    if (this.isValidImageValue(value)) {
      return
    }

    throw new BadRequestException(
      'Imported note values must be strings, finite numbers, or image metadata objects.'
    )
  }

  private ensureOrphanValueIsImportable(value: NoteValue): void {
    this.ensureImportableNoteValue(value)
  }

  private isValidImageValue(value: unknown): value is NoteImageValue {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }

    const imageValue = value as NoteImageValue
    const hasImageSource =
      typeof imageValue.dataUrl === 'string' ||
      typeof imageValue.path === 'string' ||
      typeof imageValue.url === 'string'
    const hasValidSize =
      imageValue.size === undefined ||
      (Number.isInteger(imageValue.size) && imageValue.size >= 0)
    const hasValidWidth =
      imageValue.width === undefined ||
      (Number.isInteger(imageValue.width) && imageValue.width >= 0)
    const hasValidHeight =
      imageValue.height === undefined ||
      (Number.isInteger(imageValue.height) && imageValue.height >= 0)

    return hasImageSource && hasValidSize && hasValidWidth && hasValidHeight
  }

  private isImportedSystemDefaultColumn(column: NoteColumn): boolean {
    return (
      column.isDefault &&
      (column.name === 'createdAt' || column.name === 'updatedAt')
    )
  }

  private isSystemTimestampColumn(column: NoteColumn): boolean {
    return (
      column.isDefault &&
      (column.name === 'createdAt' || column.name === 'updatedAt')
    )
  }

  private ensureUniqueValues(values: string[], message: string): void {
    if (new Set(values).size !== values.length) {
      throw new BadRequestException(message)
    }
  }

  private ensureRecord(
    value: unknown,
    message: string
  ): asserts value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException(message)
    }
  }

  private ensureRequiredString(
    value: unknown,
    label: string
  ): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${label} must be a non-empty string.`)
    }
  }

  private ensureRequiredBoolean(
    value: unknown,
    label: string
  ): asserts value is boolean {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${label} must be a boolean.`)
    }
  }

  private ensureOptionalBooleanOrNull(
    value: unknown,
    label: string
  ): asserts value is boolean | null | undefined {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${label} must be a boolean or null.`)
    }
  }

  private ensureValidColumnType(
    value: unknown
  ): asserts value is ColumnTypeEnum {
    if (!Object.values(ColumnTypeEnum).includes(value as ColumnTypeEnum)) {
      throw new BadRequestException('Column type is not supported.')
    }
  }

  private ensureNonNegativeInteger(
    value: unknown,
    label: string
  ): asserts value is number {
    if (!Number.isInteger(value) || (value as number) < 0) {
      throw new BadRequestException(`${label} must be a non-negative integer.`)
    }
  }

  private ensureOptionalPositiveIntegerOrNull(
    value: unknown,
    label: string
  ): asserts value is number | null | undefined {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new BadRequestException(
        `${label} must be a positive integer or null.`
      )
    }
  }

  private ensureRecordOrNull(
    value: unknown,
    label: string
  ): asserts value is Record<string, unknown> | null {
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
      throw new BadRequestException(`${label} must be an object or null.`)
    }
  }

  private ensureIsoDateString(
    value: unknown,
    label: string
  ): asserts value is string {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      throw new BadRequestException(`${label} must be a valid date string.`)
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}



