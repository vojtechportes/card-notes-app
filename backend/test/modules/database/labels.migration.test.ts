import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { addLabelsMigration } from '../../../src/modules/database/migrations/003-add-labels'

let databaseService: DatabaseService

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
})

afterEach(() => {
  databaseService.close()
})

describe('labels database migration', () => {
  it('creates the labels schema, foreign key, and source-scoped unique indexes idempotently', () => {
    databaseService.initialize()

    const database = databaseService.getConnection()

    expect(() => addLabelsMigration.up(database)).not.toThrow()
    const columns = database
      .prepare("PRAGMA table_info('labels')")
      .all() as Array<{
      name: string
      notnull: number
      pk: number
    }>
    const foreignKeys = database
      .prepare("PRAGMA foreign_key_list('labels')")
      .all() as Array<{
      from: string
      on_delete: string
      table: string
      to: string
    }>
    const indexes = database
      .prepare("PRAGMA index_list('labels')")
      .all() as Array<{ name: string; partial: number; unique: number }>

    expect(columns.map((column) => column.name)).toEqual([
      'id',
      'title',
      'name',
      'color',
      'note_type_id',
      'created_at',
      'updated_at',
    ])
    expect(columns.find((column) => column.name === 'id')).toEqual(
      expect.objectContaining({ pk: 1 })
    )
    expect(columns.find((column) => column.name === 'note_type_id')).toEqual(
      expect.objectContaining({ notnull: 0 })
    )
    expect(foreignKeys).toContainEqual(
      expect.objectContaining({
        table: 'note_types',
        from: 'note_type_id',
        to: 'id',
        on_delete: 'CASCADE',
      })
    )
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'idx_labels_shared_name_unique',
          partial: 1,
          unique: 1,
        }),
        expect.objectContaining({
          name: 'idx_labels_note_type_name_unique',
          partial: 1,
          unique: 1,
        }),
      ])
    )
  })
})
