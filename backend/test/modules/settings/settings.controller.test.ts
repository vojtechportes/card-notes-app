import { BadRequestException, NotFoundException } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { LabelsService } from '../../../src/modules/settings/labels.service'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsController } from '../../../src/modules/settings/settings.controller'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnDeleteModeEnum } from '../../../src/modules/settings/types/column-delete-mode-enum'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'
import { DeleteNoteTypeModeEnum } from '../../../src/modules/settings/types/delete-note-type-mode-enum'

let databaseService: DatabaseService
let settingsController: SettingsController

const getDefaultNoteTypeId = (): string => {
  return (
    databaseService
      .getConnection()
      .prepare("SELECT id FROM note_types WHERE title = 'Default'")
      .get() as { id: string }
  ).id
}

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()

  const settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService),
    new NoteTypesRepository(databaseService),
    new NotesRepository(databaseService)
  )
  settingsService.onModuleInit()
  settingsController = new SettingsController(
    settingsService,
    new LabelsService(
      new LabelsRepository(databaseService),
      new NoteTypesRepository(databaseService)
    )
  )
})

afterEach(() => {
  databaseService.close()
})

describe(SettingsController.name, () => {
  it('lists, creates, updates, and deletes note types through the API surface', () => {
    expect(settingsController.listNoteTypes()).toEqual([
      expect.objectContaining({ title: 'Default' }),
    ])

    const books = settingsController.createNoteType({ title: 'Books' })

    expect(settingsController.getNoteType(books.id)).toEqual(
      expect.objectContaining({
        id: books.id,
        title: 'Books',
        columns: [
          expect.objectContaining({ name: 'createdAt' }),
          expect.objectContaining({ name: 'updatedAt' }),
        ],
      })
    )

    expect(
      settingsController.updateNoteType(books.id, { title: 'Reading' })
    ).toEqual(
      expect.objectContaining({
        id: books.id,
        title: 'Reading',
      })
    )

    expect(
      settingsController.deleteNoteType(books.id, {
        mode: DeleteNoteTypeModeEnum.DeleteNotes,
      })
    ).toEqual({
      deletedNoteTypeId: books.id,
      deletedNotesCount: 0,
      movedNotesCount: 0,
    })
  })

  it('creates, lists, updates, hides, reorders, and deletes scoped columns', () => {
    const noteTypeId = getDefaultNoteTypeId()
    const summaryColumn = settingsController.createColumn(noteTypeId, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const ratingColumn = settingsController.createColumn(noteTypeId, {
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
      isHidden: true,
    })

    expect(
      settingsController.listColumns(noteTypeId).map((column) => column.name)
    ).toEqual(['createdAt', 'updatedAt', 'summary', 'rating'])

    const updatedColumn = settingsController.updateColumn(
      noteTypeId,
      summaryColumn.id,
      {
        title: 'Summary text',
        isHidden: true,
        config: { multiline: true },
      }
    )

    expect(updatedColumn).toEqual(
      expect.objectContaining({
        id: summaryColumn.id,
        title: 'Summary text',
        isHidden: true,
        config: { multiline: true },
      })
    )

    const defaultColumns = settingsController
      .listColumns(noteTypeId)
      .filter((column) => column.isDefault)
    expect(
      settingsController
        .reorderColumns(noteTypeId, {
          columnIds: [
            ratingColumn.id,
            summaryColumn.id,
            defaultColumns[1].id,
            defaultColumns[0].id,
          ],
        })
        .map((column) => column.id)
    ).toEqual([
      ratingColumn.id,
      summaryColumn.id,
      defaultColumns[1].id,
      defaultColumns[0].id,
    ])

    settingsController.deleteColumn(noteTypeId, ratingColumn.id, {
      deleteMode: ColumnDeleteModeEnum.DefinitionAndValues,
    })

    expect(
      settingsController.listColumns(noteTypeId).map((column) => column.id)
    ).not.toContain(ratingColumn.id)
  })

  it('supports move-notes deletion payloads with explicit mappings', () => {
    const source = settingsController.createNoteType({ title: 'Books' })
    const target = settingsController.createNoteType({ title: 'Movies' })
    const sourceSummary = settingsController.createColumn(source.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const targetSummary = settingsController.createColumn(target.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Link,
    })

    databaseService
      .getConnection()
      .prepare(
        'INSERT INTO notes (id, note_type_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .run(
        'note-1',
        source.id,
        '2026-07-07T10:00:00.000Z',
        '2026-07-07T10:00:00.000Z'
      )
    databaseService
      .getConnection()
      .prepare(
        'INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        'note-1',
        sourceSummary.id,
        JSON.stringify('Mapped value'),
        '2026-07-07T10:00:00.000Z',
        '2026-07-07T10:00:00.000Z'
      )

    expect(
      settingsController.deleteNoteType(source.id, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        targetNoteTypeId: target.id,
        fieldMappings: [
          {
            sourceColumnId: sourceSummary.id,
            targetColumnId: targetSummary.id,
          },
        ],
      })
    ).toEqual({
      deletedNoteTypeId: source.id,
      deletedNotesCount: 0,
      movedNotesCount: 1,
      targetNoteTypeId: target.id,
    })
  })

  it('validates malformed note type and scoped column payloads', () => {
    const noteTypeId = getDefaultNoteTypeId()
    const [defaultColumn] = settingsController.listColumns(noteTypeId)

    expect(() => settingsController.createNoteType(null as never)).toThrow(
      BadRequestException
    )
    expect(() =>
      settingsController.createNoteType({ title: 1 as never })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.updateNoteType(noteTypeId, [] as never)
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.deleteNoteType(noteTypeId, {
        mode: 'archive' as DeleteNoteTypeModeEnum,
      })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.deleteNoteType(noteTypeId, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        fieldMappings: {} as never,
      })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.createColumn(noteTypeId, {
        name: 'summary',
        title: 'Summary',
        type: 'unsupported' as ColumnTypeEnum,
      })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.updateColumn(noteTypeId, defaultColumn.id, [] as never)
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.reorderColumns(noteTypeId, {
        columnIds: ['one', 2 as never],
      })
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.deleteColumn(noteTypeId, defaultColumn.id, {
        deleteMode: 'everything' as ColumnDeleteModeEnum,
      })
    ).toThrow(BadRequestException)
  })

  it('throws when updating or deleting unknown note types or columns', () => {
    const noteTypeId = getDefaultNoteTypeId()

    expect(() =>
      settingsController.getNoteType('missing-note-type-id')
    ).toThrow(NotFoundException)
    expect(() =>
      settingsController.updateNoteType('missing-note-type-id', {
        title: 'Missing',
      })
    ).toThrow(NotFoundException)
    expect(() =>
      settingsController.updateColumn(noteTypeId, 'missing-column-id', {
        title: 'Missing',
      })
    ).toThrow(NotFoundException)
    expect(() =>
      settingsController.deleteColumn(noteTypeId, 'missing-column-id')
    ).toThrow(NotFoundException)
  })

  it('exposes label CRUD through the settings API surface', () => {
    const noteTypeId = getDefaultNoteTypeId()
    const label = settingsController.createLabel({
      title: ' Important ',
      name: ' important ',
      color: '#0070F2',
      noteTypeId,
    })

    expect(settingsController.listLabels()).toEqual([label])
    expect(
      settingsController.updateLabel(label.id, { title: 'Updated' })
    ).toEqual(expect.objectContaining({ title: 'Updated' }))
    expect(settingsController.deleteLabel(label.id)).toEqual({
      deletedLabelId: label.id,
      affectedNoteValuesCount: 0,
    })
    expect(() =>
      settingsController.updateLabel('missing', { title: 'Missing' })
    ).toThrow(NotFoundException)
    expect(() => settingsController.updateLabel(label.id, {})).toThrow(
      BadRequestException
    )
    expect(() =>
      settingsController.updateLabel(label.id, { unexpected: true } as never)
    ).toThrow(BadRequestException)
    expect(() =>
      settingsController.createLabel({
        title: 'Invalid',
        name: 'invalid',
        color: 1 as never,
      })
    ).toThrow(BadRequestException)
  })
  it('does not expose the legacy unscoped /settings/columns route paths on the controller', () => {
    const prototype = SettingsController.prototype as Record<string, unknown>
    const routePaths = Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => ({
        method: Reflect.getMetadata(METHOD_METADATA, prototype[name]),
        path: Reflect.getMetadata(PATH_METADATA, prototype[name]),
      }))
      .filter((route) => route.method && route.path)

    expect(routePaths).not.toContainEqual(
      expect.objectContaining({ path: 'columns' })
    )
    expect(routePaths).toContainEqual(
      expect.objectContaining({ path: 'note-types/:noteTypeId/columns' })
    )
  })
})
