import { BadRequestException, NotFoundException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesController } from '../../../src/modules/notes/notes.controller'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { NotesService } from '../../../src/modules/notes/notes.service'
import { NoteSortDirectionEnum } from '../../../src/modules/notes/types/note-sort-direction-enum'
import { NoteSortFieldEnum } from '../../../src/modules/notes/types/note-sort-field-enum'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'

let databaseService: DatabaseService
let settingsService: SettingsService
let notesController: NotesController

const getDefaultNoteTypeId = (): string =>
  settingsService.getDefaultNoteType().id

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()

  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService)
  )
  settingsService.onModuleInit()
  notesController = new NotesController(
    new NotesService(new NotesRepository(databaseService), settingsService)
  )
})

afterEach(() => {
  databaseService.close()
})

describe(NotesController.name, () => {
  it('creates and reads notes through the API surface', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })

    const createdNote = notesController.createNote({
      noteTypeId: getDefaultNoteTypeId(),
      values: { [summaryColumn.id]: 'API note' },
    })

    expect(createdNote.noteTypeId).toBe(getDefaultNoteTypeId())
    expect(createdNote.values).toEqual({ [summaryColumn.id]: 'API note' })
    expect(notesController.getNote(createdNote.id)).toEqual(createdNote)
  })

  it('creates notes from multipart image uploads without requiring base64 in the payload', () => {
    const imageColumn = settingsService.createColumn({
      name: 'printscreen',
      title: 'Printscreen',
      type: ColumnTypeEnum.Image,
    })
    const payload = {
      noteTypeId: getDefaultNoteTypeId(),
      values: {
        [imageColumn.id]: {
          altText: 'screen one',
          fileName: 'screen-one.png',
          height: 80,
          uploadKey: 'note-image-0',
          width: 120,
        },
      },
    }

    const createdNote = notesController.createNote(
      { payload: JSON.stringify(payload) } as never,
      [
        {
          buffer: Buffer.from('uploaded-image'),
          fieldname: 'note-image-0',
          mimetype: 'image/png',
          originalname: 'screen-one.png',
          size: 14,
        },
      ]
    )

    expect(createdNote.values[imageColumn.id]).toEqual({
      altText: 'screen one',
      dataUrl: `data:image/png;base64,${Buffer.from('uploaded-image').toString(
        'base64'
      )}`,
      fileName: 'screen-one.png',
      height: 80,
      mimeType: 'image/png',
      size: 14,
      width: 120,
    })
  })

  it('lists notes with default, filtered, and explicit sort query options', () => {
    const recipes = settingsService.getDefaultNoteType()
    const books = settingsService.createNoteType({ title: 'Books' })
    const recipeColumn = settingsService.createColumn(recipes.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const booksColumn = settingsService.createColumn(books.id, {
      name: 'author',
      title: 'Author',
      type: ColumnTypeEnum.Text,
    })
    const firstNote = notesController.createNote({
      noteTypeId: recipes.id,
      values: { [recipeColumn.id]: 'First' },
    })
    const secondNote = notesController.createNote({
      noteTypeId: books.id,
      values: { [booksColumn.id]: 'Second' },
    })

    databaseService
      .getConnection()
      .prepare('UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?')
      .run('2026-07-01T10:00:00.000Z', '2026-07-04T10:00:00.000Z', firstNote.id)
    databaseService
      .getConnection()
      .prepare('UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?')
      .run(
        '2026-07-02T10:00:00.000Z',
        '2026-07-03T10:00:00.000Z',
        secondNote.id
      )

    expect(notesController.listNotes({}).map((note) => note.id)).toEqual([
      secondNote.id,
      firstNote.id,
    ])
    expect(
      notesController
        .listNotes({
          noteTypeIds: recipes.id,
          sortBy: NoteSortFieldEnum.CreatedAt,
          sortDirection: NoteSortDirectionEnum.Asc,
        })
        .map((note) => note.id)
    ).toEqual([firstNote.id])
    expect(
      notesController
        .listNotes({
          noteTypeIds: `${recipes.id},${books.id}`,
          sortBy: NoteSortFieldEnum.UpdatedAt,
          sortDirection: NoteSortDirectionEnum.Desc,
        })
        .map((note) => note.id)
    ).toEqual([firstNote.id, secondNote.id])
  })

  it('updates note values and removes values through null patches', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const sourceColumn = settingsService.createColumn({
      name: 'sourceUrl',
      title: 'Source URL',
      type: ColumnTypeEnum.Link,
    })
    const note = notesController.createNote({
      noteTypeId: getDefaultNoteTypeId(),
      values: {
        [summaryColumn.id]: 'Original',
        [sourceColumn.id]: 'https://example.com',
      },
    })

    const updatedNote = notesController.updateNote(note.id, {
      values: {
        [summaryColumn.id]: 'Updated',
        [sourceColumn.id]: null,
      },
    })

    expect(updatedNote.values).toEqual({ [summaryColumn.id]: 'Updated' })
  })

  it('deletes notes through the API surface', () => {
    const note = notesController.createNote({
      noteTypeId: getDefaultNoteTypeId(),
    })

    notesController.deleteNote(note.id)

    expect(() => notesController.getNote(note.id)).toThrow(NotFoundException)
  })

  it('deletes all notes through the explicit destructive API surface', () => {
    notesController.createNote({ noteTypeId: getDefaultNoteTypeId() })
    notesController.createNote({ noteTypeId: getDefaultNoteTypeId() })

    expect(notesController.deleteAllNotes()).toEqual({ deletedCount: 2 })
    expect(notesController.listNotes({})).toEqual([])
    expect(notesController.deleteAllNotes()).toEqual({ deletedCount: 0 })
  })

  it('rejects malformed create and update request bodies', () => {
    const note = notesController.createNote({
      noteTypeId: getDefaultNoteTypeId(),
    })

    expect(() => notesController.createNote(null as never)).toThrow(
      BadRequestException
    )
    expect(() => notesController.createNote([] as never)).toThrow(
      BadRequestException
    )
    expect(() =>
      notesController.createNote({ values: [] as never } as never)
    ).toThrow(BadRequestException)
    expect(() =>
      notesController.createNote({ values: null as never } as never)
    ).toThrow(BadRequestException)
    expect(() =>
      notesController.createNote({ noteTypeId: '' } as never)
    ).toThrow(BadRequestException)
    expect(() =>
      notesController.createNote({ noteTypeId: 1 as never } as never)
    ).toThrow(BadRequestException)
    expect(() => notesController.updateNote(note.id, null as never)).toThrow(
      BadRequestException
    )
    expect(() => notesController.updateNote(note.id, [] as never)).toThrow(
      BadRequestException
    )
    expect(() =>
      notesController.updateNote(note.id, { values: [] as never })
    ).toThrow(BadRequestException)
    expect(() =>
      notesController.updateNote(note.id, { values: null as never })
    ).toThrow(BadRequestException)
  })

  it('rejects invalid sort and note type filter query values', () => {
    expect(() =>
      notesController.listNotes({ sortBy: 'title' as NoteSortFieldEnum })
    ).toThrow(BadRequestException)
    expect(() =>
      notesController.listNotes({
        sortDirection: 'sideways' as NoteSortDirectionEnum,
      })
    ).toThrow(BadRequestException)
    expect(() => notesController.listNotes({ noteTypeIds: '' })).toThrow(
      BadRequestException
    )
    expect(() =>
      notesController.listNotes({ noteTypeIds: [1 as never] })
    ).toThrow(BadRequestException)
  })
})
