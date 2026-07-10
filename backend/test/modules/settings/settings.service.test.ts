import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let databaseService: DatabaseService
let settingsService: SettingsService

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()

  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService)
  )
  settingsService.onModuleInit()
})

afterEach(() => {
  databaseService.close()
})

describe(SettingsService.name, () => {
  it('seeds createdAt and updatedAt default columns idempotently', () => {
    settingsService.onModuleInit()

    const columns = settingsService.listColumns()

    expect(columns).toHaveLength(2)
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'createdAt',
          type: ColumnTypeEnum.Date,
          sortOrder: 0,
          isHidden: false,
          isDefault: true,
        }),
        expect.objectContaining({
          name: 'updatedAt',
          type: ColumnTypeEnum.Date,
          sortOrder: 1,
          isHidden: false,
          isDefault: true,
        }),
      ])
    )
  })

  it('does not change default column timestamps when seed data is already current', () => {
    databaseService
      .getConnection()
      .prepare(
        "UPDATE note_columns SET updated_at = '2000-01-01 00:00:00' WHERE name IN ('createdAt', 'updatedAt')"
      )
      .run()

    settingsService.onModuleInit()

    expect(
      settingsService.listColumns().map((column) => column.updatedAt)
    ).toEqual(['2000-01-01 00:00:00', '2000-01-01 00:00:00'])
  })

  it('creates custom columns with uuid v4 ids and persisted display settings', () => {
    const column = settingsService.createColumn({
      name: 'sourceUrl',
      title: 'Source URL',
      type: ColumnTypeEnum.Link,
      isHidden: true,
      config: { openExternally: true },
    })

    expect(column.id).toMatch(uuidV4Pattern)
    expect(column).toEqual(
      expect.objectContaining({
        name: 'sourceUrl',
        title: 'Source URL',
        type: ColumnTypeEnum.Link,
        sortOrder: 2,
        isHidden: true,
        isDefault: false,
        config: { openExternally: true },
      })
    )
  })

  it('rejects invalid column types', () => {
    expect(() =>
      settingsService.createColumn({
        name: 'status',
        title: 'Status',
        type: 'unsupported' as ColumnTypeEnum,
      })
    ).toThrow(BadRequestException)
  })

  it('rejects invalid sort orders', () => {
    expect(() =>
      settingsService.createColumn({
        name: 'priority',
        title: 'Priority',
        type: ColumnTypeEnum.Number,
        sortOrder: -1,
      })
    ).toThrow(BadRequestException)
  })

  it('rejects duplicate column names', () => {
    settingsService.createColumn({
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })

    expect(() =>
      settingsService.createColumn({
        name: 'rating',
        title: 'Another rating',
        type: ColumnTypeEnum.Number,
      })
    ).toThrow(ConflictException)
  })

  it('updates editable column fields', () => {
    const column = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    const updatedColumn = settingsService.updateColumn(column.id, {
      name: 'summaryText',
      title: 'Summary text',
      type: ColumnTypeEnum.Link,
      sortOrder: 8,
      isHidden: true,
    })

    expect(updatedColumn).toEqual(
      expect.objectContaining({
        id: column.id,
        name: 'summaryText',
        title: 'Summary text',
        type: ColumnTypeEnum.Link,
        sortOrder: 8,
        isHidden: true,
      })
    )
  })

  it('throws when updating an unknown column', () => {
    expect(() =>
      settingsService.updateColumn('missing-column-id', { title: 'Missing' })
    ).toThrow(NotFoundException)
  })

  it('reorders all columns together', () => {
    const firstCustomColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const secondCustomColumn = settingsService.createColumn({
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })
    const defaultColumns = settingsService
      .listColumns()
      .filter((column) => column.isDefault)

    const reorderedColumns = settingsService.reorderColumns([
      secondCustomColumn.id,
      firstCustomColumn.id,
      defaultColumns[1].id,
      defaultColumns[0].id,
    ])

    expect(reorderedColumns.map((column) => column.id)).toEqual([
      secondCustomColumn.id,
      firstCustomColumn.id,
      defaultColumns[1].id,
      defaultColumns[0].id,
    ])
    expect(reorderedColumns.map((column) => column.sortOrder)).toEqual([
      0, 1, 2, 3,
    ])
  })

  it('rejects incomplete column reorder requests', () => {
    const [firstColumn] = settingsService.listColumns()

    expect(() => settingsService.reorderColumns([firstColumn.id])).toThrow(
      BadRequestException
    )
  })

  it('rejects duplicate column reorder ids', () => {
    const [firstColumn] = settingsService.listColumns()

    expect(() =>
      settingsService.reorderColumns([firstColumn.id, firstColumn.id])
    ).toThrow(BadRequestException)
  })

  it('rejects unknown column reorder ids', () => {
    const existingColumns = settingsService.listColumns()

    expect(() =>
      settingsService.reorderColumns([
        existingColumns[0].id,
        'missing-column-id',
      ])
    ).toThrow(BadRequestException)
  })

  it('prevents deleting default columns', () => {
    const [defaultColumn] = settingsService.listColumns()

    expect(() => settingsService.deleteColumn(defaultColumn.id)).toThrow(
      BadRequestException
    )
  })

  it('prevents changing default column identity', () => {
    const [defaultColumn] = settingsService.listColumns()

    expect(() =>
      settingsService.updateColumn(defaultColumn.id, {
        name: 'createdOn',
      })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsService.updateColumn(defaultColumn.id, {
        type: ColumnTypeEnum.Text,
      })
    ).toThrow(BadRequestException)
  })

  it('deletes custom columns without removing defaults', () => {
    const column = settingsService.createColumn({
      name: 'image',
      title: 'Image',
      type: ColumnTypeEnum.Image,
    })

    settingsService.deleteColumn(column.id)

    expect(settingsService.listColumns().map((item) => item.name)).toEqual([
      'createdAt',
      'updatedAt',
    ])
  })

  it('throws when deleting an unknown column', () => {
    expect(() => settingsService.deleteColumn('missing-column-id')).toThrow(
      NotFoundException
    )
  })
  it('preserves note values when deleting only a column definition', () => {
    const column = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    databaseService
      .getConnection()
      .prepare(
        "INSERT INTO notes (id, created_at, updated_at) VALUES ('note-1', '2026-07-07T10:00:00.000Z', '2026-07-07T10:00:00.000Z')"
      )
      .run()
    databaseService
      .getConnection()
      .prepare(
        'INSERT INTO note_values (note_id, column_id, value_json) VALUES (?, ?, ?)'
      )
      .run('note-1', column.id, JSON.stringify('Keep me'))

    settingsService.deleteColumn(column.id)

    const remainingValues = databaseService
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM note_values WHERE column_id = ?')
      .get(column.id) as {
      count: number
    }
    expect(remainingValues.count).toBe(1)
  })

  it('deletes associated note values when explicitly requested', () => {
    const column = settingsService.createColumn({
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })

    databaseService
      .getConnection()
      .prepare(
        "INSERT INTO notes (id, created_at, updated_at) VALUES ('note-1', '2026-07-07T10:00:00.000Z', '2026-07-07T10:00:00.000Z')"
      )
      .run()
    databaseService
      .getConnection()
      .prepare(
        'INSERT INTO note_values (note_id, column_id, value_json) VALUES (?, ?, ?)'
      )
      .run('note-1', column.id, JSON.stringify(5))

    settingsService.deleteColumn(column.id, { deleteNoteData: true })

    const remainingValues = databaseService
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM note_values WHERE column_id = ?')
      .get(column.id) as {
      count: number
    }
    expect(remainingValues.count).toBe(0)
  })

  it('gets and updates optional general settings', () => {
    expect(settingsService.getGeneralSettings()).toEqual({
      textTruncationLength: null,
      cardFieldDisplayCount: null,
      mergeDateTimeFields: null,
    })

    expect(
      settingsService.updateGeneralSettings({
        textTruncationLength: 120,
        cardFieldDisplayCount: 4,
        mergeDateTimeFields: true,
      })
    ).toEqual({
      textTruncationLength: 120,
      cardFieldDisplayCount: 4,
      mergeDateTimeFields: true,
    })

    expect(
      settingsService.updateGeneralSettings({ textTruncationLength: null })
    ).toEqual({
      textTruncationLength: null,
      cardFieldDisplayCount: 4,
      mergeDateTimeFields: true,
    })
  })

  it('rejects invalid general settings values', () => {
    expect(() =>
      settingsService.updateGeneralSettings({ textTruncationLength: 0 })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsService.updateGeneralSettings({ textTruncationLength: -1 })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsService.updateGeneralSettings({ cardFieldDisplayCount: 1.5 })
    ).toThrow(BadRequestException)
  })
})
