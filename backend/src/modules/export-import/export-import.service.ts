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
import { defaultNoteColumns } from '../settings/constants/default-note-columns'
import { areColumnTypesCompatible } from '../settings/utils/are-column-types-compatible.util'
import { isMultiImageColumn } from '../settings/utils/is-multi-image-column.util'
import { ColumnTypeEnum } from '../settings/types/column-type-enum'
import type { GeneralSettings } from '../settings/types/general-settings'
import type { NoteColumn } from '../settings/types/note-column'
import type { NoteType } from '../settings/types/note-type'
import { ExportImportDataDto } from './types/export-import-data.dto'
import type { ImportUnmatchedFieldDto } from './types/import-unmatched-field.dto'
import { ImportResultDto } from './types/import-result.dto'

const exportDataVersion = 2

interface ValidExportImportData {
  version: number
  exportedAt: string
  noteTypes: NoteType[]
  columns: NoteColumn[]
  generalSettings: GeneralSettings
  notes: Note[]
}

interface ImportOptions {
  targetNoteTypeId?: string
}

interface ColumnImportResult {
  importedColumns: number
  targetColumnIdsBySourceId: Map<string, string>
  unmatchedFields: ImportUnmatchedFieldDto[]
}

interface ImportedNoteTypeResolution {
  noteTypeIdBySourceId: Map<string, string>
  noteTypeTitleBySourceId: Map<string, string>
}

interface ResolvedSpreadsheetImport {
  mappedColumnCount: number
  rows: NoteValues[]
  unmatchedFields: ImportUnmatchedFieldDto[]
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

    return {
      version: exportDataVersion,
      exportedAt: new Date().toISOString(),
      noteTypes,
      columns: noteTypes.flatMap((noteType) =>
        this.settingsService.listColumns(noteType.id)
      ),
      generalSettings: this.settingsService.getGeneralSettings(),
      notes: this.notesService.listNotes({
        sortBy: NoteSortFieldEnum.CreatedAt,
        sortDirection: NoteSortDirectionEnum.Asc,
      }),
    }
  }

  importData(payload: unknown, options: ImportOptions = {}): ImportResultDto {
    const data = this.resolveImportPayload(payload)
    const database = this.getDatabase()
    const importPayload = database.transaction(
      (importData: ValidExportImportData): ImportResultDto => {
        if (options.targetNoteTypeId) {
          return this.importJsonIntoTargetNoteType(
            importData,
            options.targetNoteTypeId
          )
        }

        return this.importJsonPreservingNoteTypes(importData)
      }
    )

    return importPayload(data)
  }

  async importSpreadsheetData(
    buffer: Buffer,
    targetNoteTypeId: string
  ): Promise<ImportResultDto> {
    this.settingsService.getNoteType(targetNoteTypeId)

    const spreadsheetImport = await this.resolveSpreadsheetImport(
      buffer,
      targetNoteTypeId
    )
    const database = this.getDatabase()
    const importRows = database.transaction(
      (rows: NoteValues[], mappedColumnCount: number): ImportResultDto => {
        let importedNotes = 0

        for (const values of rows) {
          if (Object.keys(values).length === 0) {
            continue
          }

          this.notesService.createNote({
            noteTypeId: targetNoteTypeId,
            values,
          })
          importedNotes += 1
        }

        return {
          importedColumns: mappedColumnCount,
          importedNotes,
          unmatchedFields: spreadsheetImport.unmatchedFields,
          updatedGeneralSettings: false,
        }
      }
    )

    return importRows(
      spreadsheetImport.rows,
      spreadsheetImport.mappedColumnCount
    )
  }

  private importJsonPreservingNoteTypes(
    data: ValidExportImportData
  ): ImportResultDto {
    const importedNoteTypes = this.importNoteTypes(data.noteTypes)
    const columnImport = this.importColumnsPreservingNoteTypes(
      data.columns,
      importedNoteTypes
    )

    this.settingsService.updateGeneralSettings(data.generalSettings)

    return {
      importedColumns: columnImport.importedColumns,
      importedNotes: this.appendImportedNotes(
        data.notes,
        columnImport.targetColumnIdsBySourceId,
        (sourceNoteTypeId) => {
          const targetNoteTypeId =
            importedNoteTypes.noteTypeIdBySourceId.get(sourceNoteTypeId)

          if (!targetNoteTypeId) {
            throw new BadRequestException(
              'Imported notes must reference a known note type.'
            )
          }

          return targetNoteTypeId
        }
      ),
      unmatchedFields: columnImport.unmatchedFields,
      updatedGeneralSettings: true,
    }
  }

  private importJsonIntoTargetNoteType(
    data: ValidExportImportData,
    targetNoteTypeId: string
  ): ImportResultDto {
    const targetNoteType = this.settingsService.getNoteType(targetNoteTypeId)
    const noteTypeTitleBySourceId = new Map(
      data.noteTypes.map((noteType) => [noteType.id, noteType.title])
    )
    const columnImport = this.createTargetedColumnMappings(
      data.columns,
      noteTypeTitleBySourceId,
      targetNoteType
    )

    this.settingsService.updateGeneralSettings(data.generalSettings)

    return {
      importedColumns: columnImport.importedColumns,
      importedNotes: this.appendImportedNotes(
        data.notes,
        columnImport.targetColumnIdsBySourceId,
        () => targetNoteType.id,
        true
      ),
      unmatchedFields: columnImport.unmatchedFields,
      updatedGeneralSettings: true,
    }
  }

  private importNoteTypes(noteTypes: NoteType[]): ImportedNoteTypeResolution {
    const existingNoteTypesByTitle = new Map(
      this.settingsService
        .listNoteTypes()
        .map((noteType) => [noteType.title, noteType])
    )
    const noteTypeIdBySourceId = new Map<string, string>()
    const noteTypeTitleBySourceId = new Map<string, string>()

    for (const noteType of noteTypes) {
      const existingNoteType = existingNoteTypesByTitle.get(noteType.title)

      if (existingNoteType) {
        noteTypeIdBySourceId.set(noteType.id, existingNoteType.id)
        noteTypeTitleBySourceId.set(noteType.id, existingNoteType.title)
        continue
      }

      const importedNoteTypeId = uuidV4()

      this.insertImportedNoteType(importedNoteTypeId, noteType)
      this.insertDefaultColumnsForImportedNoteType(
        importedNoteTypeId,
        noteType.createdAt,
        noteType.updatedAt
      )
      existingNoteTypesByTitle.set(noteType.title, {
        ...noteType,
        id: importedNoteTypeId,
      })
      noteTypeIdBySourceId.set(noteType.id, importedNoteTypeId)
      noteTypeTitleBySourceId.set(noteType.id, noteType.title)
    }

    return {
      noteTypeIdBySourceId,
      noteTypeTitleBySourceId,
    }
  }

  private importColumnsPreservingNoteTypes(
    columns: NoteColumn[],
    importedNoteTypes: ImportedNoteTypeResolution
  ): ColumnImportResult {
    const columnsBySourceNoteType = new Map<string, NoteColumn[]>()

    for (const column of columns) {
      const noteTypeColumns =
        columnsBySourceNoteType.get(column.noteTypeId) ?? []

      noteTypeColumns.push(column)
      columnsBySourceNoteType.set(column.noteTypeId, noteTypeColumns)
    }

    const targetColumnIdsBySourceId = new Map<string, string>()
    const unmatchedFields: ImportUnmatchedFieldDto[] = []
    let importedColumns = 0

    for (const [
      sourceNoteTypeId,
      sourceColumns,
    ] of columnsBySourceNoteType.entries()) {
      const targetNoteTypeId =
        importedNoteTypes.noteTypeIdBySourceId.get(sourceNoteTypeId)

      if (!targetNoteTypeId) {
        throw new BadRequestException(
          'Imported column note type was not found.'
        )
      }

      const targetColumnsByName = new Map(
        this.settingsService
          .listColumns(targetNoteTypeId)
          .map((column) => [column.name, column])
      )
      let nextSortOrder = this.getNextColumnSortOrder(targetNoteTypeId)
      const orderedColumnIds: string[] = []

      for (const column of this.sortColumnsForImport(sourceColumns)) {
        const existingColumn = targetColumnsByName.get(column.name)

        if (existingColumn) {
          if (!this.canMapImportedColumn(existingColumn, column)) {
            unmatchedFields.push(
              this.createUnmatchedField(
                column,
                importedNoteTypes.noteTypeTitleBySourceId
              )
            )
            continue
          }

          if (!this.isSystemTimestampColumn(existingColumn)) {
            this.syncImportedColumn(existingColumn, column)
          }

          targetColumnIdsBySourceId.set(column.id, existingColumn.id)
          orderedColumnIds.push(existingColumn.id)
          importedColumns += 1
          continue
        }

        if (column.isDefault) {
          unmatchedFields.push(
            this.createUnmatchedField(
              column,
              importedNoteTypes.noteTypeTitleBySourceId
            )
          )
          continue
        }

        const importedColumnId = uuidV4()
        const importedColumn: NoteColumn = {
          ...column,
          id: importedColumnId,
          noteTypeId: targetNoteTypeId,
          sortOrder: nextSortOrder,
        }

        this.insertImportedColumn(importedColumn)
        nextSortOrder += 1

        targetColumnsByName.set(importedColumn.name, importedColumn)
        targetColumnIdsBySourceId.set(column.id, importedColumnId)
        orderedColumnIds.push(importedColumnId)
        importedColumns += 1
      }

      const remainingColumnIds = this.settingsService
        .listColumns(targetNoteTypeId)
        .map((column) => column.id)
        .filter((columnId) => !orderedColumnIds.includes(columnId))

      this.applyImportedColumnOrder([
        ...orderedColumnIds,
        ...remainingColumnIds,
      ])
    }

    return {
      importedColumns,
      targetColumnIdsBySourceId,
      unmatchedFields,
    }
  }

  private createTargetedColumnMappings(
    columns: NoteColumn[],
    noteTypeTitleBySourceId: Map<string, string>,
    targetNoteType: NoteType
  ): ColumnImportResult {
    const targetColumnsByName = new Map(
      this.settingsService
        .listColumns(targetNoteType.id)
        .map((column) => [column.name, column])
    )
    const targetColumnIdsBySourceId = new Map<string, string>()
    const unmatchedFields: ImportUnmatchedFieldDto[] = []
    let importedColumns = 0

    for (const column of this.sortColumnsForImport(columns)) {
      const targetColumn = targetColumnsByName.get(column.name)

      if (!targetColumn || !this.canMapImportedColumn(targetColumn, column)) {
        unmatchedFields.push(
          this.createUnmatchedField(column, noteTypeTitleBySourceId)
        )
        continue
      }

      targetColumnIdsBySourceId.set(column.id, targetColumn.id)
      importedColumns += 1
    }

    return {
      importedColumns,
      targetColumnIdsBySourceId,
      unmatchedFields,
    }
  }

  private appendImportedNotes(
    notes: Note[],
    targetColumnIdsBySourceId: Map<string, string>,
    resolveTargetNoteTypeId: (sourceNoteTypeId: string) => string,
    skipEmptyNotes = false
  ): number {
    const targetColumnsById = new Map(
      this.settingsService
        .listNoteTypes()
        .flatMap((noteType) => this.settingsService.listColumns(noteType.id))
        .map((column) => [column.id, column])
    )
    let importedNotes = 0

    for (const note of notes) {
      const targetNoteTypeId = resolveTargetNoteTypeId(note.noteTypeId)
      const values = this.resolveImportedNoteValues(
        note.values,
        targetColumnIdsBySourceId,
        targetColumnsById
      )

      if (skipEmptyNotes && Object.keys(values).length === 0) {
        continue
      }

      this.insertImportedNote(
        uuidV4(),
        targetNoteTypeId,
        values,
        note.createdAt,
        note.updatedAt
      )
      importedNotes += 1
    }

    return importedNotes
  }

  private resolveImportedNoteValues(
    values: NoteValues,
    targetColumnIdsBySourceId: Map<string, string>,
    targetColumnsById: Map<string, NoteColumn>
  ): NoteValues {
    const resolvedValues: NoteValues = {}

    for (const [sourceColumnId, value] of Object.entries(values)) {
      const targetColumnId = targetColumnIdsBySourceId.get(sourceColumnId)

      if (!targetColumnId) {
        continue
      }

      const targetColumn = targetColumnsById.get(targetColumnId)

      if (!targetColumn) {
        throw new BadRequestException('Imported target column was not found.')
      }

      if (this.isSystemTimestampColumn(targetColumn)) {
        throw new BadRequestException(
          'Imported note values cannot target system timestamp columns.'
        )
      }

      this.ensureValueMatchesColumnType(value, targetColumn)
      resolvedValues[targetColumnId] = value
    }

    return resolvedValues
  }

  private async resolveSpreadsheetImport(
    buffer: Buffer,
    targetNoteTypeId: string
  ): Promise<ResolvedSpreadsheetImport> {
    const workbook = new Workbook()

    try {
      const workbookBuffer = buffer as unknown as Parameters<
        (typeof workbook.xlsx)['load']
      >[0]
      await workbook.xlsx.load(workbookBuffer)
    } catch {
      throw new BadRequestException(
        'Import file must contain a valid XLSX workbook.'
      )
    }

    const worksheet = workbook.worksheets[0]

    if (!worksheet) {
      throw new BadRequestException(
        'XLSX import file must contain at least one worksheet.'
      )
    }

    const headerRow = worksheet.getRow(1)
    const columnIndexes = Array.from(
      { length: worksheet.columnCount },
      (_, index) => index + 1
    )

    if (columnIndexes.length === 0) {
      throw new BadRequestException(
        'XLSX import file must contain a header row.'
      )
    }

    const existingColumnsByName = new Map(
      this.settingsService
        .listColumns(targetNoteTypeId)
        .filter((column) => !this.isSystemTimestampColumn(column))
        .map((column) => [column.name, column])
    )
    const mappedColumnsByIndex = new Map<number, NoteColumn>()
    const headerNames: string[] = []
    const unmatchedFields: ImportUnmatchedFieldDto[] = []

    for (const columnIndex of columnIndexes) {
      const headerName = headerRow.getCell(columnIndex).text.trim()

      if (!headerName) {
        continue
      }

      headerNames.push(headerName)

      const existingColumn = existingColumnsByName.get(headerName)

      if (existingColumn) {
        mappedColumnsByIndex.set(columnIndex, existingColumn)
        continue
      }

      unmatchedFields.push({
        name: headerName,
        noteTypeTitle: null,
        title: null,
        type: null,
      })
    }

    this.ensureSpreadsheetHeaderNamesAreAllowed(
      headerNames,
      existingColumnsByName
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
          this.assignSpreadsheetValue(values, column, resolvedValue)
        }
      }

      rows.push(values)
    }

    return {
      mappedColumnCount: mappedColumnsByIndex.size,
      rows,
      unmatchedFields,
    }
  }

  private ensureSpreadsheetHeaderNamesAreAllowed(
    headerNames: string[],
    existingColumnsByName: Map<string, NoteColumn>
  ): void {
    const headerCounts = new Map<string, number>()

    for (const headerName of headerNames) {
      headerCounts.set(headerName, (headerCounts.get(headerName) ?? 0) + 1)
    }

    for (const [headerName, count] of headerCounts.entries()) {
      if (count <= 1) {
        continue
      }

      const column = existingColumnsByName.get(headerName)

      if (column?.type === ColumnTypeEnum.Image) {
        continue
      }

      throw new BadRequestException(
        'XLSX duplicate header names are only supported for image columns.'
      )
    }
  }

  private assignSpreadsheetValue(
    values: NoteValues,
    column: NoteColumn,
    resolvedValue: NoteValue
  ): void {
    if (column.type !== ColumnTypeEnum.Image) {
      values[column.id] = resolvedValue
      return
    }

    if (!isMultiImageColumn(column)) {
      if (values[column.id] === undefined) {
        values[column.id] = resolvedValue
      }

      return
    }

    if (!this.isValidImageValue(resolvedValue)) {
      return
    }

    const existingValue = values[column.id]

    if (
      Array.isArray(existingValue) &&
      existingValue.every((value) => this.isValidImageValue(value))
    ) {
      values[column.id] = [...existingValue, resolvedValue]
      return
    }

    if (this.isValidImageValue(existingValue)) {
      values[column.id] = [existingValue, resolvedValue]
      return
    }

    values[column.id] = [resolvedValue]
  }
  private resolveWorksheetImages(
    worksheet: Workbook['worksheets'][number],
    workbook: Workbook
  ): Map<string, NoteImageValue> {
    const imagesByCellAddress = new Map<string, NoteImageValue>()

    const workbookMedia = workbook.model.media as unknown as
      SpreadsheetWorkbookMedia[] | undefined

    for (const image of worksheet.getImages()) {
      const mediaIndex = Number(image.imageId)
      const media = Number.isInteger(mediaIndex)
        ? workbookMedia?.[mediaIndex]
        : undefined
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

  private resolveSpreadsheetTextValue(
    value: unknown,
    cellText: string
  ): string {
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

  private resolveSpreadsheetLinkValue(
    value: unknown,
    cellText: string
  ): string {
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
      throw new BadRequestException(
        'Number note values must be finite numbers.'
      )
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
      throw new BadRequestException(
        'Date note values must be valid date strings.'
      )
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

    return new Date(
      baseDate + wholeDays * 24 * 60 * 60 * 1000 + millisecondsFromTime
    )
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

  private sortColumnsForImport(columns: NoteColumn[]): NoteColumn[] {
    return [...columns].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }

      return left.name.localeCompare(right.name)
    })
  }

  private canMapImportedColumn(
    targetColumn: NoteColumn,
    importedColumn: NoteColumn
  ): boolean {
    if (this.isSystemTimestampColumn(targetColumn)) {
      return this.isImportedSystemDefaultColumn(importedColumn)
    }

    if (importedColumn.isDefault) {
      return false
    }

    return areColumnTypesCompatible(importedColumn.type, targetColumn.type)
  }

  private createUnmatchedField(
    column: NoteColumn,
    noteTypeTitleBySourceId: Map<string, string>
  ): ImportUnmatchedFieldDto {
    return {
      name: column.name,
      noteTypeTitle: noteTypeTitleBySourceId.get(column.noteTypeId) ?? null,
      title: column.title,
      type: column.type,
    }
  }

  private resolveImportPayload(payload: unknown): ValidExportImportData {
    this.ensureRecord(payload, 'Import payload must be an object.')

    if (payload.version !== exportDataVersion) {
      throw new BadRequestException('Import payload version is not supported.')
    }

    this.ensureIsoDateString(payload.exportedAt, 'Export timestamp')

    if (!Array.isArray(payload.noteTypes)) {
      throw new BadRequestException(
        'Import payload note types must be an array.'
      )
    }

    if (!Array.isArray(payload.columns)) {
      throw new BadRequestException('Import payload columns must be an array.')
    }

    if (!Array.isArray(payload.notes)) {
      throw new BadRequestException('Import payload notes must be an array.')
    }

    const noteTypes = payload.noteTypes.map((noteType) =>
      this.resolveImportedNoteType(noteType)
    )
    const columns = payload.columns.map((column) =>
      this.resolveImportedColumn(column)
    )
    const notes = payload.notes.map((note) => this.resolveImportedNote(note))
    const generalSettings = this.resolveGeneralSettings(payload.generalSettings)

    this.ensureUniqueValues(
      noteTypes.map((noteType) => noteType.id),
      'Imported note type ids must be unique.'
    )
    this.ensureUniqueValues(
      noteTypes.map((noteType) => noteType.title),
      'Imported note type titles must be unique.'
    )
    this.ensureUniqueValues(
      columns.map((column) => column.id),
      'Imported column ids must be unique.'
    )
    this.ensureUniqueValues(
      columns.map((column) => `${column.noteTypeId}:${column.name}`),
      'Imported column names must be unique within each note type.'
    )
    this.ensureUniqueValues(
      notes.map((note) => note.id),
      'Imported note ids must be unique.'
    )
    this.ensureColumnsBelongToKnownNoteTypes(noteTypes, columns)
    this.ensureNotesBelongToKnownNoteTypes(noteTypes, notes)
    this.ensureNoteValuesMatchImport(columns, notes)

    return {
      version: payload.version,
      exportedAt: payload.exportedAt,
      noteTypes,
      columns,
      generalSettings,
      notes,
    }
  }

  private resolveImportedNoteType(value: unknown): NoteType {
    this.ensureRecord(value, 'Imported note type must be an object.')
    this.ensureRequiredString(value.id, 'Imported note type id')
    this.ensureRequiredString(value.title, 'Imported note type title')
    this.ensureIsoDateString(
      value.createdAt,
      'Imported note type created timestamp'
    )
    this.ensureIsoDateString(
      value.updatedAt,
      'Imported note type updated timestamp'
    )

    return {
      id: value.id,
      title: value.title.trim(),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
  }

  private resolveImportedColumn(value: unknown): NoteColumn {
    this.ensureRecord(value, 'Imported column must be an object.')
    this.ensureRequiredString(value.id, 'Imported column id')
    this.ensureRequiredString(value.noteTypeId, 'Imported column note type id')
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
      noteTypeId: value.noteTypeId.trim(),
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
    this.ensureRequiredString(value.noteTypeId, 'Imported note note type id')
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
      noteTypeId: value.noteTypeId.trim(),
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

  private ensureColumnsBelongToKnownNoteTypes(
    noteTypes: NoteType[],
    columns: NoteColumn[]
  ): void {
    const noteTypeIds = new Set(noteTypes.map((noteType) => noteType.id))

    for (const column of columns) {
      if (!noteTypeIds.has(column.noteTypeId)) {
        throw new BadRequestException(
          'Imported columns must reference known imported note types.'
        )
      }
    }
  }

  private ensureNotesBelongToKnownNoteTypes(
    noteTypes: NoteType[],
    notes: Note[]
  ): void {
    const noteTypeIds = new Set(noteTypes.map((noteType) => noteType.id))

    for (const note of notes) {
      if (!noteTypeIds.has(note.noteTypeId)) {
        throw new BadRequestException(
          'Imported notes must reference known imported note types.'
        )
      }
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
          throw new BadRequestException(
            'Imported note values must reference imported columns.'
          )
        }

        if (column.noteTypeId !== note.noteTypeId) {
          throw new BadRequestException(
            'Imported note values must belong to fields owned by the note type.'
          )
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

  private insertImportedNoteType(id: string, noteType: NoteType): void {
    this.getDatabase()
      .prepare(
        `
        INSERT INTO note_types (id, title, created_at, updated_at)
        VALUES (@id, @title, @createdAt, @updatedAt)
      `
      )
      .run({
        id,
        title: noteType.title,
        createdAt: noteType.createdAt,
        updatedAt: noteType.updatedAt,
      })
  }

  private insertDefaultColumnsForImportedNoteType(
    noteTypeId: string,
    createdAt: string,
    updatedAt: string
  ): void {
    for (const column of defaultNoteColumns) {
      this.insertImportedColumn({
        id: uuidV4(),
        noteTypeId,
        name: column.name,
        title: column.title,
        type: column.type,
        sortOrder: column.sortOrder,
        isHidden: false,
        isDefault: true,
        config: null,
        createdAt,
        updatedAt,
      })
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

  private syncImportedColumn(
    existingColumn: NoteColumn,
    importedColumn: NoteColumn
  ): void {
    this.getDatabase()
      .prepare(
        `
        UPDATE note_columns
        SET title = @title,
            is_hidden = @isHidden,
            config_json = @configJson,
            updated_at = @updatedAt
        WHERE id = @id
      `
      )
      .run({
        id: existingColumn.id,
        title: importedColumn.title,
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

  private applyImportedColumnOrder(columnIds: string[]): void {
    columnIds.forEach((columnId, index) => {
      this.getDatabase()
        .prepare(
          'UPDATE note_columns SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(index, columnId)
    })
  }

  private getNextColumnSortOrder(noteTypeId: string): number {
    const row = this.getDatabase()
      .prepare(
        'SELECT COALESCE(MAX(sort_order) + 1, 0) as sort_order FROM note_columns WHERE note_type_id = ?'
      )
      .get(noteTypeId) as { sort_order: number } | undefined

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
        if (!this.isValidImageNoteValue(value, column)) {
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

    if (this.isValidImageValue(value) || this.isValidImageValueList(value)) {
      return
    }

    throw new BadRequestException(
      'Imported note values must be strings, finite numbers, image metadata objects, or image metadata arrays.'
    )
  }

  private isValidImageNoteValue(
    value: NoteValue,
    column: NoteColumn
  ): value is NoteImageValue | NoteImageValue[] {
    if (this.isValidImageValue(value)) {
      return true
    }

    return isMultiImageColumn(column) && this.isValidImageValueList(value)
  }

  private isValidImageValueList(value: unknown): value is NoteImageValue[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => this.isValidImageValue(item))
    )
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
