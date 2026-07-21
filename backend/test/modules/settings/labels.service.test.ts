import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { LabelsService } from '../../../src/modules/settings/labels.service'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'

let databaseService: DatabaseService
let labelsService: LabelsService
let noteTypesRepository: NoteTypesRepository

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  noteTypesRepository = new NoteTypesRepository(databaseService)
  labelsService = new LabelsService(
    new LabelsRepository(databaseService),
    noteTypesRepository
  )
})

afterEach(() => {
  databaseService.close()
})

describe(LabelsService.name, () => {
  it('creates, lists, and updates normalized shared and template labels', () => {
    const noteType = noteTypesRepository.create({ title: 'Books' })
    const sharedLabel = labelsService.createLabel({
      title: ' Important ',
      name: ' important ',
      color: '#d20a0a',
    })
    const templateLabel = labelsService.createLabel({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: noteType.id,
    })

    expect(sharedLabel).toEqual(
      expect.objectContaining({
        title: 'Important',
        name: 'important',
        color: '#D20A0A',
        noteTypeId: null,
      })
    )
    expect(labelsService.listLabels()).toHaveLength(2)
    expect(
      labelsService.updateLabel(templateLabel.id, {
        title: ' Read next ',
        noteTypeId: null,
      })
    ).toEqual(
      expect.objectContaining({
        title: 'Read next',
        name: 'unread',
        noteTypeId: null,
      })
    )
  })

  it('enforces source-scoped names and reports source-move conflicts', () => {
    const books = noteTypesRepository.create({ title: 'Books' })
    const movies = noteTypesRepository.create({ title: 'Movies' })
    labelsService.createLabel({
      title: 'Favorite',
      name: 'favorite',
      color: '#0070F2',
      noteTypeId: books.id,
    })
    const movieLabel = labelsService.createLabel({
      title: 'Favorite movie',
      name: 'favorite',
      color: '#188918',
      noteTypeId: movies.id,
    })

    expect(() =>
      labelsService.createLabel({
        title: 'Duplicate',
        name: ' favorite ',
        color: '#C35500',
        noteTypeId: books.id,
      })
    ).toThrow(ConflictException)
    expect(() =>
      labelsService.updateLabel(movieLabel.id, { noteTypeId: books.id })
    ).toThrow(ConflictException)
  })

  it('rejects invalid label fields, missing sources, and empty updates', () => {
    const label = labelsService.createLabel({
      title: 'Valid',
      name: 'valid',
      color: '#0070F2',
    })

    expect(() =>
      labelsService.createLabel({
        title: ' ',
        name: 'invalid',
        color: '#0070F2',
      })
    ).toThrow(BadRequestException)
    expect(() =>
      labelsService.createLabel({
        title: 'Invalid color',
        name: 'invalid-color',
        color: 'blue',
      })
    ).toThrow(BadRequestException)
    expect(() =>
      labelsService.createLabel({
        title: 'Invalid source',
        name: 'invalid-source',
        color: '#0070F2',
        noteTypeId: 'missing-note-type',
      })
    ).toThrow(BadRequestException)
    expect(() => labelsService.updateLabel(label.id, {})).toThrow(
      BadRequestException
    )
  })

  it('deletes a label, reports changed note values, and rejects missing ids', () => {
    const database = databaseService.getConnection()
    const noteType = noteTypesRepository.create({ title: 'Books' })
    const label = labelsService.createLabel({
      title: 'Unread',
      name: 'unread',
      color: '#0070F2',
      noteTypeId: noteType.id,
    })

    database
      .prepare(
        `INSERT INTO note_columns
          (id, note_type_id, name, title, type, sort_order, is_hidden, is_default)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)`
      )
      .run('labels-column', noteType.id, 'labels', 'Labels', 'labels', 0)
    database
      .prepare('INSERT INTO notes (id, note_type_id) VALUES (?, ?)')
      .run('note-id', noteType.id)
    database
      .prepare(
        'INSERT INTO note_values (note_id, column_id, value_json) VALUES (?, ?, ?)'
      )
      .run('note-id', 'labels-column', JSON.stringify([label.id]))

    expect(labelsService.deleteLabel(label.id)).toEqual({
      deletedLabelId: label.id,
      affectedNoteValuesCount: 1,
    })
    expect(() => labelsService.getLabel(label.id)).toThrow(NotFoundException)
    expect(() => labelsService.deleteLabel(label.id)).toThrow(NotFoundException)
  })
})
