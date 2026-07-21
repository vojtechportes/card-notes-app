import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'
import { DeleteNoteTypeModeEnum } from '../../../src/modules/settings/types/delete-note-type-mode-enum'

let databaseService: DatabaseService
let labelsRepository: LabelsRepository
let notesRepository: NotesRepository
let settingsService: SettingsService

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  labelsRepository = new LabelsRepository(databaseService)
  notesRepository = new NotesRepository(databaseService)
  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService),
    new NoteTypesRepository(databaseService),
    notesRepository,
    labelsRepository
  )
  settingsService.onModuleInit()
})

afterEach(() => {
  databaseService.close()
})

describe('Settings label field mappings', () => {
  it('keeps only labels allowed by a multi-select target field', () => {
    const source = settingsService.createNoteType({ title: 'Source' })
    const target = settingsService.createNoteType({ title: 'Target' })
    const books = settingsService.createNoteType({ title: 'Books' })
    const movies = settingsService.createNoteType({ title: 'Movies' })
    const sharedLabel = labelsRepository.create({
      title: 'Shared',
      name: 'shared',
      color: '#0070F2',
      noteTypeId: null,
    })
    const bookLabel = labelsRepository.create({
      title: 'Book',
      name: 'book',
      color: '#188918',
      noteTypeId: books.id,
    })
    const movieLabel = labelsRepository.create({
      title: 'Movie',
      name: 'movie',
      color: '#C35500',
      noteTypeId: movies.id,
    })
    const sourceColumn = settingsService.createColumn(source.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: true, sources: null },
    })
    const targetColumn = settingsService.createColumn(target.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: {
        allowMultiple: true,
        sources: { includeShared: true, noteTypeIds: [books.id] },
      },
    })
    const note = notesRepository.create(
      'note-id',
      source.id,
      {
        [sourceColumn.id]: [
          movieLabel.id,
          sharedLabel.id,
          bookLabel.id,
          sharedLabel.id,
          'missing-label',
        ],
      },
      '2026-07-21T10:00:00.000Z'
    )

    settingsService.deleteNoteType(source.id, {
      mode: DeleteNoteTypeModeEnum.MoveNotes,
      targetNoteTypeId: target.id,
      fieldMappings: [
        {
          sourceColumnId: sourceColumn.id,
          targetColumnId: targetColumn.id,
        },
      ],
    })

    expect(notesRepository.findById(note.id)?.values[targetColumn.id]).toEqual([
      sharedLabel.id,
      bookLabel.id,
    ])
  })

  it('keeps the first allowed label when moving into a single-select target', () => {
    const source = settingsService.createNoteType({ title: 'Source' })
    const target = settingsService.createNoteType({ title: 'Target' })
    const disallowedType = settingsService.createNoteType({ title: 'Other' })
    const disallowedLabel = labelsRepository.create({
      title: 'Other',
      name: 'other',
      color: '#C35500',
      noteTypeId: disallowedType.id,
    })
    const firstSharedLabel = labelsRepository.create({
      title: 'First',
      name: 'first',
      color: '#0070F2',
      noteTypeId: null,
    })
    const secondSharedLabel = labelsRepository.create({
      title: 'Second',
      name: 'second',
      color: '#188918',
      noteTypeId: null,
    })
    const sourceColumn = settingsService.createColumn(source.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: true, sources: null },
    })
    const targetColumn = settingsService.createColumn(target.id, {
      name: 'label',
      title: 'Label',
      type: ColumnTypeEnum.Labels,
      config: {
        allowMultiple: false,
        sources: { includeShared: true, noteTypeIds: [] },
      },
    })
    const note = notesRepository.create(
      'note-id',
      source.id,
      {
        [sourceColumn.id]: [
          disallowedLabel.id,
          firstSharedLabel.id,
          secondSharedLabel.id,
        ],
      },
      '2026-07-21T10:00:00.000Z'
    )

    settingsService.deleteNoteType(source.id, {
      mode: DeleteNoteTypeModeEnum.MoveNotes,
      targetNoteTypeId: target.id,
      fieldMappings: [
        {
          sourceColumnId: sourceColumn.id,
          targetColumnId: targetColumn.id,
        },
      ],
    })

    expect(notesRepository.findById(note.id)?.values[targetColumn.id]).toEqual([
      firstSharedLabel.id,
    ])
  })
})
