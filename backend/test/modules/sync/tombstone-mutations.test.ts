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
import { DeleteNoteTypeModeEnum } from '../../../src/modules/settings/types/delete-note-type-mode-enum'
import { isUuidV4 } from '../../../src/modules/sync/utils/is-uuid-v4.util'

let databaseService: DatabaseService
let columnsRepository: ColumnsRepository
let generalSettingsRepository: GeneralSettingsRepository
let labelsRepository: LabelsRepository
let noteTypesRepository: NoteTypesRepository
let notesRepository: NotesRepository
let settingsService: SettingsService
let labelsService: LabelsService
let notesService: NotesService

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  columnsRepository = new ColumnsRepository(databaseService)
  generalSettingsRepository = new GeneralSettingsRepository(databaseService)
  labelsRepository = new LabelsRepository(databaseService)
  noteTypesRepository = new NoteTypesRepository(databaseService)
  notesRepository = new NotesRepository(databaseService)
  settingsService = new SettingsService(
    columnsRepository,
    generalSettingsRepository,
    noteTypesRepository,
    notesRepository,
    labelsRepository
  )
  settingsService.onModuleInit()
  labelsService = new LabelsService(labelsRepository, noteTypesRepository)
  notesService = new NotesService(
    notesRepository,
    settingsService,
    labelsService
  )
})

afterEach(() => {
  databaseService.close()
})

describe('synchronization tombstones and mutation metadata', () => {
  it('backfills valid mutation metadata and exposes tombstones only to recovery reads', () => {
    const device = databaseService
      .getConnection()
      .prepare('SELECT device_id FROM sync_identity WHERE id = 1')
      .get() as { device_id: string }
    const defaultType = settingsService.getDefaultNoteType()
    const column = settingsService.createColumn(defaultType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const note = notesService.createNote({
      noteTypeId: defaultType.id,
      values: { [column.id]: 'Remember me' },
    })

    notesService.deleteNote(note.id)

    expect(notesRepository.findById(note.id)).toBeUndefined()
    expect(notesRepository.findAll()).toEqual([])
    const tombstone = notesRepository.findByIdIncludingDeleted(note.id)

    expect(tombstone).toMatchObject({
      id: note.id,
      deletedAt: expect.any(String),
      deletionDeviceId: device.device_id,
      modifiedByDeviceId: device.device_id,
      values: { [column.id]: 'Remember me' },
    })
    expect(isUuidV4(tombstone?.mutationId ?? '')).toBe(true)
    expect(tombstone?.deletionMutationId).toBe(tombstone?.mutationId)
    expect(() =>
      notesRepository.create(
        note.id,
        defaultType.id,
        {},
        new Date().toISOString()
      )
    ).toThrow()
  })

  it('permits live names to be reused without reviving configuration tombstones', () => {
    const noteType = settingsService.createNoteType({ title: 'Books' })
    const column = settingsService.createColumn(noteType.id, {
      name: 'author',
      title: 'Author',
      type: ColumnTypeEnum.Text,
    })
    const label = labelsService.createLabel({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: noteType.id,
    })

    settingsService.deleteColumn(noteType.id, column.id)
    labelsService.deleteLabel(label.id)
    settingsService.deleteNoteType(noteType.id, {
      mode: DeleteNoteTypeModeEnum.DeleteNotes,
    })

    const replacementType = settingsService.createNoteType({ title: 'Books' })
    const replacementColumn = settingsService.createColumn(replacementType.id, {
      name: 'author',
      title: 'Author',
      type: ColumnTypeEnum.Text,
    })
    const replacementLabel = labelsService.createLabel({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: replacementType.id,
    })

    expect(replacementType.id).not.toBe(noteType.id)
    expect(replacementColumn.id).not.toBe(column.id)
    expect(replacementLabel.id).not.toBe(label.id)
    expect(
      noteTypesRepository
        .findAllIncludingDeleted()
        .find((candidate) => candidate.id === noteType.id)?.deletedAt
    ).toEqual(expect.any(String))
    expect(
      columnsRepository
        .findAllIncludingDeleted()
        .find((candidate) => candidate.id === column.id)?.deletedAt
    ).toEqual(expect.any(String))
    expect(
      labelsRepository
        .findAllIncludingDeleted()
        .find((candidate) => candidate.id === label.id)?.deletedAt
    ).toEqual(expect.any(String))
  })

  it('marks owning notes when label and field cleanup removes synchronized values', () => {
    const noteType = settingsService.createNoteType({ title: 'Books' })
    const labelsColumn = settingsService.createColumn(noteType.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: {
        allowMultiple: true,
        sources: { includeShared: false, noteTypeIds: [noteType.id] },
      },
    })
    const summaryColumn = settingsService.createColumn(noteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const label = labelsService.createLabel({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: noteType.id,
    })
    const note = notesService.createNote({
      noteTypeId: noteType.id,
      values: {
        [labelsColumn.id]: [label.id],
        [summaryColumn.id]: 'Delete this value',
      },
    })
    const initialMutationId = notesRepository.findByIdIncludingDeleted(
      note.id
    )?.mutationId

    labelsService.deleteLabel(label.id)
    const afterLabelCleanup = notesRepository.findByIdIncludingDeleted(note.id)

    expect(afterLabelCleanup?.values[labelsColumn.id]).toEqual([])
    expect(afterLabelCleanup?.mutationId).not.toBe(initialMutationId)

    settingsService.deleteColumn(noteType.id, summaryColumn.id, {
      deleteNoteData: true,
    })
    const afterFieldCleanup = notesRepository.findByIdIncludingDeleted(note.id)

    expect(afterFieldCleanup?.values[summaryColumn.id]).toBeUndefined()
    expect(afterFieldCleanup?.mutationId).not.toBe(
      afterLabelCleanup?.mutationId
    )
  })

  it('uses one coherent mutation for a multi-setting update', () => {
    settingsService.updateGeneralSettings({
      cardFieldDisplayCount: 3,
      textTruncationLength: 120,
    })

    const records = generalSettingsRepository.findAllWithMutationMetadata()

    expect(records).toHaveLength(2)
    expect(new Set(records.map((record) => record.mutationId))).toHaveLength(1)
    expect(records.every((record) => isUuidV4(record.mutationId))).toBe(true)
    expect(
      new Set(records.map((record) => record.modifiedByDeviceId))
    ).toHaveLength(1)
  })

  it('tombstones every entity in delete-template cascades atomically', () => {
    const noteType = settingsService.createNoteType({ title: 'Projects' })
    const column = settingsService.createColumn(noteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const label = labelsService.createLabel({
      title: 'Active',
      name: 'active',
      color: '#188918',
      noteTypeId: noteType.id,
    })
    const note = notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'Plan' },
    })

    settingsService.deleteNoteType(noteType.id, {
      mode: DeleteNoteTypeModeEnum.DeleteNotes,
    })

    expect(settingsService.listNoteTypes()).not.toContainEqual(noteType)
    expect(notesRepository.findById(note.id)).toBeUndefined()
    expect(
      notesRepository.findByIdIncludingDeleted(note.id)?.deletedAt
    ).toEqual(expect.any(String))
    expect(
      columnsRepository
        .findAllIncludingDeleted()
        .find((candidate) => candidate.id === column.id)?.deletedAt
    ).toEqual(expect.any(String))
    expect(
      labelsRepository
        .findAllIncludingDeleted()
        .find((candidate) => candidate.id === label.id)?.deletedAt
    ).toEqual(expect.any(String))
  })
})
