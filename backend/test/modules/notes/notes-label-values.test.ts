import { BadRequestException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { NotesService } from '../../../src/modules/notes/notes.service'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { LabelsService } from '../../../src/modules/settings/labels.service'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'

let databaseService: DatabaseService
let labelsService: LabelsService
let notesService: NotesService
let settingsService: SettingsService

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  const noteTypesRepository = new NoteTypesRepository(databaseService)
  const notesRepository = new NotesRepository(databaseService)

  labelsService = new LabelsService(
    new LabelsRepository(databaseService),
    noteTypesRepository
  )
  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService),
    noteTypesRepository,
    notesRepository
  )
  settingsService.onModuleInit()
  notesService = new NotesService(
    notesRepository,
    settingsService,
    labelsService
  )
})

afterEach(() => {
  databaseService.close()
})

describe('Labels note values', () => {
  it('accepts empty, single, and multiple label-id arrays according to cardinality', () => {
    const noteType = settingsService.getDefaultNoteType()
    const firstLabel = labelsService.createLabel({
      title: 'First',
      name: 'first',
      color: '#0070F2',
    })
    const secondLabel = labelsService.createLabel({
      title: 'Second',
      name: 'second',
      color: '#188918',
    })
    const singleColumn = settingsService.createColumn(noteType.id, {
      name: 'primaryLabel',
      title: 'Primary label',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: false, sources: null },
    })
    const multipleColumn = settingsService.createColumn(noteType.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: true, sources: null },
    })

    expect(
      notesService.createNote({
        noteTypeId: noteType.id,
        values: {
          [singleColumn.id]: [firstLabel.id],
          [multipleColumn.id]: [firstLabel.id, secondLabel.id],
        },
      }).values
    ).toEqual({
      [singleColumn.id]: [firstLabel.id],
      [multipleColumn.id]: [firstLabel.id, secondLabel.id],
    })
    expect(
      notesService.createNote({
        noteTypeId: noteType.id,
        values: { [singleColumn.id]: [] },
      }).values[singleColumn.id]
    ).toEqual([])
  })

  it('rejects scalars, duplicates, unknown ids, and excessive single selections', () => {
    const noteType = settingsService.getDefaultNoteType()
    const label = labelsService.createLabel({
      title: 'Known',
      name: 'known',
      color: '#0070F2',
    })
    const column = settingsService.createColumn(noteType.id, {
      name: 'label',
      title: 'Label',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: false, sources: null },
    })
    const createWithValue = (value: unknown) =>
      notesService.createNote({
        noteTypeId: noteType.id,
        values: { [column.id]: value as never },
      })

    expect(() => createWithValue(label.id)).toThrow(BadRequestException)
    expect(() => createWithValue([label.id, label.id])).toThrow(
      BadRequestException
    )
    expect(() => createWithValue(['missing-label'])).toThrow(
      BadRequestException
    )
    expect(() => createWithValue([label.id, 'missing-label'])).toThrow(
      BadRequestException
    )
  })

  it('enforces shared and template-specific allowed sources on create and update', () => {
    const notesType = settingsService.getDefaultNoteType()
    const books = settingsService.createNoteType({ title: 'Books' })
    const movies = settingsService.createNoteType({ title: 'Movies' })
    const sharedLabel = labelsService.createLabel({
      title: 'Shared',
      name: 'shared',
      color: '#0070F2',
    })
    const bookLabel = labelsService.createLabel({
      title: 'Book',
      name: 'book',
      color: '#188918',
      noteTypeId: books.id,
    })
    const movieLabel = labelsService.createLabel({
      title: 'Movie',
      name: 'movie',
      color: '#C35500',
      noteTypeId: movies.id,
    })
    const column = settingsService.createColumn(notesType.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: {
        allowMultiple: true,
        sources: { includeShared: true, noteTypeIds: [books.id] },
      },
    })
    const note = notesService.createNote({
      noteTypeId: notesType.id,
      values: { [column.id]: [sharedLabel.id, bookLabel.id] },
    })

    expect(note.values[column.id]).toEqual([sharedLabel.id, bookLabel.id])
    expect(() =>
      notesService.updateNote(note.id, {
        values: { [column.id]: [movieLabel.id] },
      })
    ).toThrow(BadRequestException)
  })
})
