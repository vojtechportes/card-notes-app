import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'
import { DeleteNoteTypeModeEnum } from '../../../src/modules/settings/types/delete-note-type-mode-enum'

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let databaseService: DatabaseService
let notesRepository: NotesRepository
let settingsService: SettingsService

const insertNote = (
  noteTypeId: string,
  values: Record<string, unknown>
): string => {
  const noteId = `note-${Math.random().toString(36).slice(2, 10)}`
  const timestamp = '2026-07-07T10:00:00.000Z'

  databaseService
    .getConnection()
    .prepare(
      'INSERT INTO notes (id, note_type_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
    )
    .run(noteId, noteTypeId, timestamp, timestamp)

  for (const [columnId, value] of Object.entries(values)) {
    databaseService
      .getConnection()
      .prepare(
        'INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(noteId, columnId, JSON.stringify(value), timestamp, timestamp)
  }

  return noteId
}

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()

  notesRepository = new NotesRepository(databaseService)
  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService),
    new NoteTypesRepository(databaseService),
    notesRepository
  )
  settingsService.onModuleInit()
})

afterEach(() => {
  databaseService.close()
})

describe(SettingsService.name, () => {
  it('seeds the default note type and its default columns idempotently', () => {
    settingsService.onModuleInit()

    const noteTypes = settingsService.listNoteTypes()
    const defaultNoteType = settingsService.getDefaultNoteType()
    const columns = settingsService.listColumns(defaultNoteType.id)

    expect(noteTypes).toHaveLength(1)
    expect(noteTypes[0].title).toBe('Default')
    expect(columns).toHaveLength(2)
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'createdAt',
          type: ColumnTypeEnum.Date,
          sortOrder: 0,
          isDefault: true,
        }),
        expect.objectContaining({
          name: 'updatedAt',
          type: ColumnTypeEnum.Date,
          sortOrder: 1,
          isDefault: true,
        }),
      ])
    )
  })

  it('creates note types with uuid ids and seeds per-type default columns', () => {
    const noteType = settingsService.createNoteType({ title: 'Books' })

    expect(noteType.id).toMatch(uuidV4Pattern)
    expect(noteType.title).toBe('Books')
    expect(settingsService.listColumns(noteType.id).map((column) => column.name)).toEqual([
      'createdAt',
      'updatedAt',
    ])
  })

  it('updates note types and rejects duplicate titles', () => {
    const books = settingsService.createNoteType({ title: 'Books' })
    settingsService.createNoteType({ title: 'Movies' })

    expect(
      settingsService.updateNoteType(books.id, { title: ' Reading ' })
    ).toEqual(
      expect.objectContaining({
        id: books.id,
        title: 'Reading',
      })
    )

    expect(() =>
      settingsService.updateNoteType(books.id, { title: 'Movies' })
    ).toThrow(ConflictException)
  })

  it('creates scoped columns and scopes name uniqueness per note type', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const books = settingsService.createNoteType({ title: 'Books' })

    const defaultSummary = settingsService.createColumn(defaultNoteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const booksSummary = settingsService.createColumn(books.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    expect(defaultSummary.noteTypeId).toBe(defaultNoteType.id)
    expect(booksSummary.noteTypeId).toBe(books.id)
    expect(() =>
      settingsService.createColumn(defaultNoteType.id, {
        name: 'summary',
        title: 'Duplicate',
        type: ColumnTypeEnum.Text,
      })
    ).toThrow(ConflictException)
  })

  it('updates, reorders, and deletes columns within their owning note type only', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const books = settingsService.createNoteType({ title: 'Books' })
    const summary = settingsService.createColumn(defaultNoteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const rating = settingsService.createColumn(defaultNoteType.id, {
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })

    expect(
      settingsService.updateColumn(defaultNoteType.id, summary.id, {
        title: 'Summary text',
        isHidden: true,
      })
    ).toEqual(
      expect.objectContaining({
        id: summary.id,
        title: 'Summary text',
        isHidden: true,
      })
    )

    expect(
      settingsService
        .reorderColumns(defaultNoteType.id, [
          rating.id,
          summary.id,
          ...settingsService
            .listColumns(defaultNoteType.id)
            .filter((column) => column.isDefault)
            .map((column) => column.id),
        ])
        .map((column) => column.id)
    ).toEqual([
      rating.id,
      summary.id,
      ...settingsService
        .listColumns(defaultNoteType.id)
        .filter((column) => column.isDefault)
        .map((column) => column.id),
    ])

    expect(() =>
      settingsService.updateColumn(books.id, summary.id, { title: 'Wrong type' })
    ).toThrow(NotFoundException)
    expect(() =>
      settingsService.reorderColumns(books.id, [summary.id])
    ).toThrow(BadRequestException)
    expect(() => settingsService.deleteColumn(books.id, summary.id)).toThrow(
      NotFoundException
    )
  })

  it('preserves note values when deleting only a column definition', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const column = settingsService.createColumn(defaultNoteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    insertNote(defaultNoteType.id, {
      [column.id]: 'Keep me',
    })

    settingsService.deleteColumn(defaultNoteType.id, column.id)

    const remainingValues = databaseService
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM note_values WHERE column_id = ?')
      .get(column.id) as { count: number }
    expect(remainingValues.count).toBe(1)
  })

  it('deletes associated note values when explicitly requested', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const column = settingsService.createColumn(defaultNoteType.id, {
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })

    insertNote(defaultNoteType.id, {
      [column.id]: 5,
    })

    settingsService.deleteColumn(defaultNoteType.id, column.id, {
      deleteNoteData: true,
    })

    const remainingValues = databaseService
      .getConnection()
      .prepare('SELECT COUNT(*) as count FROM note_values WHERE column_id = ?')
      .get(column.id) as { count: number }
    expect(remainingValues.count).toBe(0)
  })

  it('deletes a note type together with its notes', () => {
    const books = settingsService.createNoteType({ title: 'Books' })
    const summary = settingsService.createColumn(books.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    insertNote(books.id, {
      [summary.id]: 'Delete me',
    })

    expect(
      settingsService.deleteNoteType(books.id, {
        mode: DeleteNoteTypeModeEnum.DeleteNotes,
      })
    ).toEqual({
      deletedNoteTypeId: books.id,
      deletedNotesCount: 1,
      movedNotesCount: 0,
    })
    expect(settingsService.listNoteTypes().map((noteType) => noteType.id)).not.toContain(
      books.id
    )
  })

  it('recreates Default when deleting the last remaining note type with delete-notes', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const summary = settingsService.createColumn(defaultNoteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    insertNote(defaultNoteType.id, {
      [summary.id]: 'Only note',
    })

    settingsService.deleteNoteType(defaultNoteType.id, {
      mode: DeleteNoteTypeModeEnum.DeleteNotes,
    })

    const noteTypes = settingsService.listNoteTypes()
    expect(noteTypes).toHaveLength(1)
    expect(noteTypes[0].title).toBe('Default')
    expect(noteTypes[0].id).not.toBe(defaultNoteType.id)
    expect(settingsService.listColumns(noteTypes[0].id).map((column) => column.name)).toEqual([
      'createdAt',
      'updatedAt',
    ])
  })

  it('moves notes to another type and preserves only explicitly mapped values', () => {
    const books = settingsService.createNoteType({ title: 'Books' })
    const movies = settingsService.createNoteType({ title: 'Movies' })
    const sourceSummary = settingsService.createColumn(books.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const sourceRating = settingsService.createColumn(books.id, {
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })
    const targetSummary = settingsService.createColumn(movies.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Link,
    })

    const noteId = insertNote(books.id, {
      [sourceSummary.id]: 'Mapped value',
      [sourceRating.id]: 7,
    })

    expect(
      settingsService.deleteNoteType(books.id, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        targetNoteTypeId: movies.id,
        fieldMappings: [
          {
            sourceColumnId: sourceSummary.id,
            targetColumnId: targetSummary.id,
          },
        ],
      })
    ).toEqual({
      deletedNoteTypeId: books.id,
      deletedNotesCount: 0,
      movedNotesCount: 1,
      targetNoteTypeId: movies.id,
    })

    expect(notesRepository.findById(noteId)).toEqual(
      expect.objectContaining({
        id: noteId,
        noteTypeId: movies.id,
        values: {
          [targetSummary.id]: 'Mapped value',
        },
      })
    )
  })

  it('can create a replacement note type while moving notes', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const summary = settingsService.createColumn(defaultNoteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const noteId = insertNote(defaultNoteType.id, {
      [summary.id]: 'Move me',
    })

    const result = settingsService.deleteNoteType(defaultNoteType.id, {
      mode: DeleteNoteTypeModeEnum.MoveNotes,
      createTargetNoteType: {
        title: 'Archive',
      },
    })

    const noteTypes = settingsService.listNoteTypes()
    expect(result.targetNoteTypeId).toBeTruthy()
    expect(noteTypes).toHaveLength(1)
    expect(noteTypes[0].title).toBe('Archive')
    expect(notesRepository.findById(noteId)).toEqual(
      expect.objectContaining({
        id: noteId,
        noteTypeId: result.targetNoteTypeId,
        values: {},
      })
    )
  })

  it('rejects incompatible or invalid move mappings', () => {
    const books = settingsService.createNoteType({ title: 'Books' })
    const movies = settingsService.createNoteType({ title: 'Movies' })
    const sourceRating = settingsService.createColumn(books.id, {
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })
    const targetSummary = settingsService.createColumn(movies.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const [createdAtColumn] = settingsService.listColumns(movies.id)

    expect(() =>
      settingsService.deleteNoteType(books.id, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        targetNoteTypeId: movies.id,
        fieldMappings: [
          {
            sourceColumnId: sourceRating.id,
            targetColumnId: targetSummary.id,
          },
        ],
      })
    ).toThrow(BadRequestException)

    expect(() =>
      settingsService.deleteNoteType(books.id, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        targetNoteTypeId: movies.id,
        fieldMappings: [
          {
            sourceColumnId: sourceRating.id,
            targetColumnId: createdAtColumn.id,
          },
        ],
      })
    ).toThrow(BadRequestException)

    expect(() =>
      settingsService.deleteNoteType(books.id, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        targetNoteTypeId: books.id,
      })
    ).toThrow(BadRequestException)
  })

  it('rolls back replacement note type creation when move validation fails', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const sourceRating = settingsService.createColumn(defaultNoteType.id, {
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    })

    expect(() =>
      settingsService.deleteNoteType(defaultNoteType.id, {
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        createTargetNoteType: { title: 'Archive' },
        fieldMappings: [
          {
            sourceColumnId: sourceRating.id,
            targetColumnId: 'missing-target-column-id',
          },
        ],
      })
    ).toThrow(BadRequestException)

    expect(settingsService.listNoteTypes().map((noteType) => noteType.title)).toEqual([
      'Default',
    ])
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

