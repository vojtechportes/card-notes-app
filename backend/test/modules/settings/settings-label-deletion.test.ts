import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { DeleteNoteTypeModeEnum } from '../../../src/modules/settings/types/delete-note-type-mode-enum'
import { insertTestColumn } from './utils/insert-test-column.util'
import { insertTestNote } from './utils/insert-test-note.util'
import { insertTestValue } from './utils/insert-test-value.util'
import { readTestValue } from './utils/read-test-value.util'

let databaseService: DatabaseService
let labelsRepository: LabelsRepository
let settingsService: SettingsService

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  labelsRepository = new LabelsRepository(databaseService)
  settingsService = new SettingsService(
    new ColumnsRepository(databaseService),
    new GeneralSettingsRepository(databaseService),
    new NoteTypesRepository(databaseService),
    new NotesRepository(databaseService),
    labelsRepository
  )
  settingsService.onModuleInit()
})

afterEach(() => {
  databaseService.close()
})

describe('Settings label deletion behavior', () => {
  it('removes owned labels and cross-template references when deleting a note type and its notes', () => {
    const database = databaseService.getConnection()
    const source = settingsService.createNoteType({ title: 'Books' })
    const target = settingsService.createNoteType({ title: 'Movies' })
    const ownedLabel = labelsRepository.create({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: source.id,
    })
    const sharedLabel = labelsRepository.create({
      title: 'Favorite',
      name: 'favorite',
      color: '#188918',
      noteTypeId: null,
    })

    insertTestColumn(database, 'target-labels', target.id, 'labels', 'labels')
    insertTestNote(database, 'target-note', target.id)
    insertTestValue(database, 'target-note', 'target-labels', [
      ownedLabel.id,
      sharedLabel.id,
    ])

    settingsService.deleteNoteType(source.id, {
      mode: DeleteNoteTypeModeEnum.DeleteNotes,
    })

    expect(labelsRepository.findById(ownedLabel.id)).toBeUndefined()
    expect(labelsRepository.findById(sharedLabel.id)).toBeDefined()
    expect(readTestValue(database, 'target-note', 'target-labels')).toEqual([
      sharedLabel.id,
    ])
  })

  it('removes owned labels and cross-template references when moving notes before deletion', () => {
    const database = databaseService.getConnection()
    const source = settingsService.createNoteType({ title: 'Books' })
    const target = settingsService.createNoteType({ title: 'Movies' })
    const ownedLabel = labelsRepository.create({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: source.id,
    })

    insertTestColumn(database, 'target-labels', target.id, 'labels', 'labels')
    insertTestNote(database, 'source-note', source.id)
    insertTestNote(database, 'target-note', target.id)
    insertTestValue(database, 'target-note', 'target-labels', [ownedLabel.id])

    const result = settingsService.deleteNoteType(source.id, {
      mode: DeleteNoteTypeModeEnum.MoveNotes,
      targetNoteTypeId: target.id,
    })

    expect(result.movedNotesCount).toBe(1)
    expect(labelsRepository.findById(ownedLabel.id)).toBeUndefined()
    expect(readTestValue(database, 'target-note', 'target-labels')).toEqual([])
    expect(
      database
        .prepare('SELECT note_type_id FROM notes WHERE id = ?')
        .get('source-note')
    ).toEqual({ note_type_id: target.id })
  })

  it('rolls note, label, and value cleanup back when note-type deletion fails', () => {
    const database = databaseService.getConnection()
    const source = settingsService.createNoteType({ title: 'Books' })
    const target = settingsService.createNoteType({ title: 'Movies' })
    const ownedLabel = labelsRepository.create({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: source.id,
    })

    insertTestColumn(database, 'target-labels', target.id, 'labels', 'labels')
    insertTestNote(database, 'source-note', source.id)
    insertTestNote(database, 'target-note', target.id)
    insertTestValue(database, 'target-note', 'target-labels', [ownedLabel.id])
    database.exec(`
      CREATE TRIGGER prevent_note_type_delete
      BEFORE DELETE ON note_types
      BEGIN
        SELECT RAISE(ABORT, 'note type delete blocked');
      END;
    `)

    expect(() =>
      settingsService.deleteNoteType(source.id, {
        mode: DeleteNoteTypeModeEnum.DeleteNotes,
      })
    ).toThrow()
    expect(
      database.prepare('SELECT id FROM notes WHERE id = ?').get('source-note')
    ).toEqual({ id: 'source-note' })
    expect(labelsRepository.findById(ownedLabel.id)).toBeDefined()
    expect(readTestValue(database, 'target-note', 'target-labels')).toEqual([
      ownedLabel.id,
    ])
  })
  it('rolls moved notes, mapped values, labels, and cleanup back when move deletion fails', () => {
    const database = databaseService.getConnection()
    const source = settingsService.createNoteType({ title: 'Books' })
    const target = settingsService.createNoteType({ title: 'Movies' })
    const ownedLabel = labelsRepository.create({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: source.id,
    })

    insertTestColumn(database, 'source-text', source.id, 'summary', 'text')
    insertTestColumn(database, 'target-text', target.id, 'summary', 'text')
    insertTestColumn(database, 'target-labels', target.id, 'labels', 'labels')
    insertTestNote(database, 'source-note', source.id)
    insertTestNote(database, 'target-note', target.id)
    insertTestValue(database, 'source-note', 'source-text', 'Source value')
    insertTestValue(database, 'target-note', 'target-labels', [ownedLabel.id])
    database.exec(`
      CREATE TRIGGER prevent_note_type_delete
      BEFORE DELETE ON note_types
      BEGIN
        SELECT RAISE(ABORT, 'note type delete blocked');
      END;
    `)

    expect(() =>
      settingsService.deleteNoteType(source.id, {
        fieldMappings: [
          {
            sourceColumnId: 'source-text',
            targetColumnId: 'target-text',
          },
        ],
        mode: DeleteNoteTypeModeEnum.MoveNotes,
        targetNoteTypeId: target.id,
      })
    ).toThrow()
    expect(
      database
        .prepare('SELECT note_type_id FROM notes WHERE id = ?')
        .get('source-note')
    ).toEqual({ note_type_id: source.id })
    expect(readTestValue(database, 'source-note', 'source-text')).toBe(
      'Source value'
    )
    expect(
      database
        .prepare(
          'SELECT COUNT(*) as count FROM note_values WHERE note_id = ? AND column_id = ?'
        )
        .get('source-note', 'target-text')
    ).toEqual({ count: 0 })
    expect(labelsRepository.findById(ownedLabel.id)).toBeDefined()
    expect(readTestValue(database, 'target-note', 'target-labels')).toEqual([
      ownedLabel.id,
    ])
  })
  it('does not leave owned labels behind when deleting the last note type', () => {
    const defaultNoteType = settingsService.getDefaultNoteType()

    labelsRepository.create({
      title: 'Temporary',
      name: 'temporary',
      color: '#C35500',
      noteTypeId: defaultNoteType.id,
    })

    settingsService.deleteNoteType(defaultNoteType.id, {
      mode: DeleteNoteTypeModeEnum.DeleteNotes,
    })

    expect(labelsRepository.findAll()).toEqual([])
    expect(settingsService.listNoteTypes()).toHaveLength(1)
    expect(settingsService.getDefaultNoteType().id).not.toBe(defaultNoteType.id)
  })
})
