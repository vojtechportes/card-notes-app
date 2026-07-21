import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { insertTestColumn } from './utils/insert-test-column.util'
import { insertTestNote } from './utils/insert-test-note.util'
import { insertTestValue } from './utils/insert-test-value.util'
import { readTestValue } from './utils/read-test-value.util'

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let databaseService: DatabaseService
let labelsRepository: LabelsRepository
let noteTypesRepository: NoteTypesRepository

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  labelsRepository = new LabelsRepository(databaseService)
  noteTypesRepository = new NoteTypesRepository(databaseService)
})

afterEach(() => {
  databaseService.close()
})

describe(LabelsRepository.name, () => {
  it('creates and maps shared and note-template labels with UUID v4 ids', () => {
    const noteType = noteTypesRepository.create({ title: 'Books' })
    const sharedLabel = labelsRepository.create({
      title: 'Important',
      name: 'important',
      color: '#D20A0A',
      noteTypeId: null,
    })
    const templateLabel = labelsRepository.create({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: noteType.id,
    })

    expect(sharedLabel.id).toMatch(uuidV4Pattern)
    expect(sharedLabel.noteTypeId).toBeNull()
    expect(sharedLabel.createdAt).toBeTruthy()
    expect(sharedLabel.updatedAt).toBeTruthy()
    expect(templateLabel).toEqual(
      expect.objectContaining({
        title: 'Unread',
        name: 'unread',
        color: '#0070F2',
        noteTypeId: noteType.id,
      })
    )
    expect(labelsRepository.findAll()).toHaveLength(2)
  })

  it('enforces case-sensitive label-name uniqueness within each source', () => {
    const books = noteTypesRepository.create({ title: 'Books' })
    const movies = noteTypesRepository.create({ title: 'Movies' })

    labelsRepository.create({
      title: 'Favorite',
      name: 'favorite',
      color: '#0070F2',
      noteTypeId: null,
    })

    expect(() =>
      labelsRepository.create({
        title: 'Duplicate shared',
        name: 'favorite',
        color: '#188918',
        noteTypeId: null,
      })
    ).toThrow()
    expect(() =>
      labelsRepository.create({
        title: 'Different case',
        name: 'Favorite',
        color: '#188918',
        noteTypeId: null,
      })
    ).not.toThrow()

    labelsRepository.create({
      title: 'Favorite book',
      name: 'favorite',
      color: '#0070F2',
      noteTypeId: books.id,
    })

    expect(() =>
      labelsRepository.create({
        title: 'Duplicate book label',
        name: 'favorite',
        color: '#188918',
        noteTypeId: books.id,
      })
    ).toThrow()
    expect(() =>
      labelsRepository.create({
        title: 'Favorite movie',
        name: 'favorite',
        color: '#188918',
        noteTypeId: movies.id,
      })
    ).not.toThrow()
  })

  it('prunes a deleted label from label values without changing unrelated arrays', () => {
    const database = databaseService.getConnection()
    const noteType = noteTypesRepository.create({ title: 'Books' })
    const removedLabel = labelsRepository.create({
      title: 'Removed',
      name: 'removed',
      color: '#D20A0A',
      noteTypeId: noteType.id,
    })
    const keptLabel = labelsRepository.create({
      title: 'Kept',
      name: 'kept',
      color: '#188918',
      noteTypeId: null,
    })

    insertTestColumn(database, 'labels-column', noteType.id, 'labels', 'labels')
    insertTestColumn(database, 'images-column', noteType.id, 'images', 'image')
    insertTestNote(database, 'note-id', noteType.id)
    insertTestValue(database, 'note-id', 'labels-column', [
      removedLabel.id,
      keptLabel.id,
    ])
    insertTestValue(database, 'note-id', 'images-column', [removedLabel.id])

    expect(labelsRepository.deleteWithValueCleanup(removedLabel.id)).toBe(true)
    expect(readTestValue(database, 'note-id', 'labels-column')).toEqual([
      keptLabel.id,
    ])
    expect(readTestValue(database, 'note-id', 'images-column')).toEqual([
      removedLabel.id,
    ])
    expect(labelsRepository.findById(removedLabel.id)).toBeUndefined()
  })

  it('stores an empty array after deleting the only assigned label', () => {
    const database = databaseService.getConnection()
    const noteType = noteTypesRepository.create({ title: 'Books' })
    const label = labelsRepository.create({
      title: 'Only label',
      name: 'only-label',
      color: '#0070F2',
      noteTypeId: noteType.id,
    })

    insertTestColumn(database, 'labels-column', noteType.id, 'labels', 'labels')
    insertTestNote(database, 'note-id', noteType.id)
    insertTestValue(database, 'note-id', 'labels-column', [label.id])

    labelsRepository.deleteWithValueCleanup(label.id)

    expect(readTestValue(database, 'note-id', 'labels-column')).toEqual([])
  })
  it('rolls note-value cleanup back when label deletion fails', () => {
    const database = databaseService.getConnection()
    const noteType = noteTypesRepository.create({ title: 'Books' })
    const label = labelsRepository.create({
      title: 'Protected',
      name: 'protected',
      color: '#D20A0A',
      noteTypeId: noteType.id,
    })

    insertTestColumn(database, 'labels-column', noteType.id, 'labels', 'labels')
    insertTestNote(database, 'note-id', noteType.id)
    insertTestValue(database, 'note-id', 'labels-column', [label.id])
    database.exec(`
      CREATE TRIGGER prevent_label_delete
      BEFORE DELETE ON labels
      BEGIN
        SELECT RAISE(ABORT, 'label delete blocked');
      END;
    `)

    expect(() => labelsRepository.deleteWithValueCleanup(label.id)).toThrow()
    expect(readTestValue(database, 'note-id', 'labels-column')).toEqual([
      label.id,
    ])
    expect(labelsRepository.findById(label.id)).toBeDefined()
  })
})
