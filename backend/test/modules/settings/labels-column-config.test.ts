import { BadRequestException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'

let databaseService: DatabaseService
let notesRepository: NotesRepository
let settingsService: SettingsService

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

describe('Labels column configuration', () => {
  it('accepts all-source and explicit shared/template source configurations', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const books = settingsService.createNoteType({ title: 'Books' })
    const allSources = settingsService.createColumn(defaultNoteType.id, {
      name: 'allLabels',
      title: 'All labels',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: true, sources: null },
    })
    const selectedSources = settingsService.createColumn(defaultNoteType.id, {
      name: 'selectedLabels',
      title: 'Selected labels',
      type: ColumnTypeEnum.Labels,
      config: {
        allowMultiple: false,
        sources: { includeShared: true, noteTypeIds: [books.id] },
      },
    })

    expect(settingsService.getLabelsColumnConfig(allSources)).toEqual({
      allowMultiple: true,
      sources: null,
    })
    expect(settingsService.getLabelsColumnConfig(selectedSources)).toEqual({
      allowMultiple: false,
      sources: { includeShared: true, noteTypeIds: [books.id] },
    })
  })

  it('rejects malformed, empty, duplicate, and unknown explicit sources', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()
    const createLabelsColumn = (config: Record<string, unknown> | null) =>
      settingsService.createColumn(defaultNoteType.id, {
        name: `labels-${Math.random()}`,
        title: 'Labels',
        type: ColumnTypeEnum.Labels,
        config,
      })

    expect(() => createLabelsColumn(null)).toThrow(BadRequestException)
    expect(() =>
      createLabelsColumn({
        allowMultiple: false,
        sources: { includeShared: false, noteTypeIds: [] },
      })
    ).toThrow(BadRequestException)
    expect(() =>
      createLabelsColumn({
        allowMultiple: true,
        sources: {
          includeShared: false,
          noteTypeIds: [defaultNoteType.id, defaultNoteType.id],
        },
      })
    ).toThrow(BadRequestException)
    expect(() =>
      createLabelsColumn({
        allowMultiple: true,
        sources: { includeShared: false, noteTypeIds: ['missing'] },
      })
    ).toThrow(BadRequestException)
  })

  it('rejects labels config on non-label columns', () => {
    expect(() =>
      settingsService.createColumn({
        name: 'summary',
        title: 'Summary',
        type: ColumnTypeEnum.Text,
        config: { allowMultiple: true, sources: null },
      })
    ).toThrow(BadRequestException)
  })

  it('blocks changing a populated multi-select labels column to single-select', () => {
    const noteType = settingsService.getDefaultNoteType()
    const column = settingsService.createColumn(noteType.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: { allowMultiple: true, sources: null },
    })

    notesRepository.create(
      'note-id',
      noteType.id,
      { [column.id]: ['label-one', 'label-two'] },
      '2026-07-21T10:00:00.000Z'
    )

    expect(() =>
      settingsService.updateColumn(noteType.id, column.id, {
        config: { allowMultiple: false, sources: null },
      })
    ).toThrow(BadRequestException)
  })
})
