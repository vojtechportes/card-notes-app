import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'
import type { SyncEntityMetadata } from '../sync/types/sync-entity-metadata'
import { createLocalMutationMetadata } from '../sync/utils/create-local-mutation-metadata.util'
import { enqueueNoteSyncMutation } from '../sync/utils/enqueue-note-sync-mutation.util'
import { refreshNoteMutationMetadata } from './utils/refresh-note-mutation-metadata.util'
import type { Note } from './types/note'
import type { BackgroundEnumDto } from './types/background-enum.dto'
import { NoteSortDirectionEnum } from './types/note-sort-direction-enum'
import { NoteSortFieldEnum } from './types/note-sort-field-enum'
import type { ListNotesOptions } from './types/list-notes-options'
import type { NoteValue, NoteValuePatch, NoteValues } from './types/note-value'

interface NoteRow {
  id: string
  note_type_id: string
  background: BackgroundEnumDto | null
  created_at: string
  updated_at: string
  mutation_id: string
  modified_by_device_id: string
  modified_at: string
  deleted_at: string | null
  deletion_mutation_id: string | null
  deletion_device_id: string | null
}

interface NoteValueRow {
  note_id: string
  column_id: string
  value_json: string | null
}

interface MoveNotesToTypeOptions {
  fieldMappings: Array<{
    sourceColumnId: string
    targetColumnId: string
    transformValue?: (value: NoteValue) => NoteValue
  }>
  sourceColumnIds: string[]
  sourceNoteTypeId: string
  targetNoteTypeId: string
  timestamp: string
}

@Injectable()
export class NotesRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  create(
    id: string,
    noteTypeId: string,
    values: NoteValues,
    timestamp: string
  ): Note {
    const database = this.getDatabase()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const insertNote = database.prepare(`
      INSERT INTO notes (
        id, note_type_id, created_at, updated_at, mutation_id,
        modified_by_device_id, modified_at
      ) VALUES (
        @id, @noteTypeId, @createdAt, @updatedAt, @mutationId,
        @modifiedByDeviceId, @modifiedAt
      )
    `)
    const createNote = database.transaction(
      (noteId: string, typeId: string, noteValues: NoteValues) => {
        insertNote.run({
          id: noteId,
          noteTypeId: typeId,
          createdAt: timestamp,
          updatedAt: timestamp,
          ...mutation,
        })
        this.upsertValues(noteId, noteValues, timestamp)
        enqueueNoteSyncMutation(database, noteId, mutation)
      }
    )

    createNote(id, noteTypeId, values)

    return this.findById(id) as Note
  }

  findAll(options: ListNotesOptions = {}): Note[] {
    const sortColumn = this.getSortColumn(
      options.sortBy ?? NoteSortFieldEnum.CreatedAt
    )
    const sortDirection =
      options.sortDirection === NoteSortDirectionEnum.Asc ? 'ASC' : 'DESC'
    const notes = this.findNoteRows(
      options.noteTypeIds,
      sortColumn,
      sortDirection,
      false
    )

    return this.attachValues(notes)
  }

  findAllIncludingDeleted(): Array<Note & SyncEntityMetadata> {
    const notes = this.findNoteRows(undefined, 'created_at', 'ASC', true)

    return this.attachValues(notes)
  }

  findById(id: string): Note | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL')
      .get(id) as NoteRow | undefined

    return row
      ? { ...this.mapNoteRow(row), values: this.findValuesByNoteId(id) }
      : undefined
  }

  findByIdIncludingDeleted(
    id: string
  ): (Note & SyncEntityMetadata) | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(id) as NoteRow | undefined

    return row
      ? { ...this.mapSyncNoteRow(row), values: this.findValuesByNoteId(id) }
      : undefined
  }

  updateValues(
    id: string,
    values: NoteValuePatch,
    timestamp: string
  ): Note | undefined {
    if (!this.findById(id)) {
      return undefined
    }

    const database = this.getDatabase()
    const updateNoteValues = database.transaction(() => {
      this.applyValuePatch(id, values, timestamp)
      refreshNoteMutationMetadata(database, [id], timestamp)
    })

    updateNoteValues()

    return this.findById(id)
  }

  updateBackground(
    id: string,
    background: BackgroundEnumDto | null,
    timestamp: string
  ): Note | undefined {
    const database = this.getDatabase()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const updateBackground = database.transaction(() => {
      const result = database
        .prepare(
          `
          UPDATE notes
          SET background = @background,
              mutation_id = @mutationId,
              modified_by_device_id = @modifiedByDeviceId,
              modified_at = @modifiedAt
          WHERE id = @id AND deleted_at IS NULL
        `
        )
        .run({ id, background, ...mutation })

      if (result.changes > 0) {
        enqueueNoteSyncMutation(database, id, mutation)
      }

      return result.changes
    })

    return updateBackground() > 0 ? this.findById(id) : undefined
  }

  delete(id: string, timestamp: string): boolean {
    return this.tombstoneNotes([id], timestamp) > 0
  }

  deleteAll(timestamp: string): number {
    const noteIds = (
      this.getDatabase()
        .prepare(
          'SELECT id FROM notes WHERE deleted_at IS NULL ORDER BY id ASC'
        )
        .all() as Array<{ id: string }>
    ).map((row) => row.id)

    return this.tombstoneNotes(noteIds, timestamp)
  }

  deleteByNoteTypeId(noteTypeId: string, timestamp: string): number {
    const noteIds = (
      this.getDatabase()
        .prepare(
          'SELECT id FROM notes WHERE note_type_id = ? AND deleted_at IS NULL ORDER BY id ASC'
        )
        .all(noteTypeId) as Array<{ id: string }>
    ).map((row) => row.id)

    return this.tombstoneNotes(noteIds, timestamp)
  }

  moveNotesToType(options: MoveNotesToTypeOptions): number {
    const database = this.getDatabase()
    const noteIds = (
      database
        .prepare(
          'SELECT id FROM notes WHERE note_type_id = ? AND deleted_at IS NULL ORDER BY id ASC'
        )
        .all(options.sourceNoteTypeId) as Array<{ id: string }>
    ).map((row) => row.id)

    if (noteIds.length === 0) {
      return 0
    }

    const noteIdPlaceholders = noteIds.map(() => '?').join(', ')
    const copyMappedValues = database.transaction(() => {
      for (const fieldMapping of options.fieldMappings) {
        if (fieldMapping.transformValue) {
          const sourceRows = database
            .prepare(
              `SELECT note_id, value_json
               FROM note_values
               WHERE note_id IN (${noteIdPlaceholders}) AND column_id = ?`
            )
            .all(...noteIds, fieldMapping.sourceColumnId) as Array<{
            note_id: string
            value_json: string | null
          }>
          const upsertTransformedValue = database.prepare(`
            INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(note_id, column_id) DO UPDATE SET
              value_json = excluded.value_json,
              updated_at = excluded.updated_at
          `)

          for (const sourceRow of sourceRows) {
            upsertTransformedValue.run(
              sourceRow.note_id,
              fieldMapping.targetColumnId,
              JSON.stringify(
                fieldMapping.transformValue(
                  this.parseValue(sourceRow.value_json)
                )
              ),
              options.timestamp,
              options.timestamp
            )
          }
        } else {
          database
            .prepare(
              `
              INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at)
              SELECT note_id, ?, value_json, ?, ?
              FROM note_values
              WHERE note_id IN (${noteIdPlaceholders}) AND column_id = ?
              ON CONFLICT(note_id, column_id) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = excluded.updated_at
            `
            )
            .run(
              fieldMapping.targetColumnId,
              options.timestamp,
              options.timestamp,
              ...noteIds,
              fieldMapping.sourceColumnId
            )
        }
      }

      database
        .prepare(
          `UPDATE notes
           SET note_type_id = ?, updated_at = ?
           WHERE id IN (${noteIdPlaceholders}) AND deleted_at IS NULL`
        )
        .run(options.targetNoteTypeId, options.timestamp, ...noteIds)

      if (options.sourceColumnIds.length > 0) {
        const sourceColumnPlaceholders = options.sourceColumnIds
          .map(() => '?')
          .join(', ')

        database
          .prepare(
            `DELETE FROM note_values
             WHERE note_id IN (${noteIdPlaceholders})
               AND column_id IN (${sourceColumnPlaceholders})`
          )
          .run(...noteIds, ...options.sourceColumnIds)
      }

      refreshNoteMutationMetadata(database, noteIds, options.timestamp)
    })

    copyMappedValues()

    return noteIds.length
  }

  hasMultipleLabelValuesForColumn(columnId: string): boolean {
    const rows = this.getDatabase()
      .prepare(
        `
        SELECT note_values.value_json
        FROM note_values
        INNER JOIN notes ON notes.id = note_values.note_id
        WHERE note_values.column_id = ? AND notes.deleted_at IS NULL
      `
      )
      .all(columnId) as Array<{ value_json: string | null }>

    return rows.some((row) => {
      if (row.value_json === null) {
        return false
      }

      try {
        const value: unknown = JSON.parse(row.value_json)

        return Array.isArray(value) && value.length > 1
      } catch {
        return false
      }
    })
  }

  deleteValuesForColumn(columnId: string, timestamp: string): number {
    const database = this.getDatabase()
    const noteIds = (
      database
        .prepare(
          `
          SELECT DISTINCT note_values.note_id AS id
          FROM note_values
          INNER JOIN notes ON notes.id = note_values.note_id
          WHERE note_values.column_id = ? AND notes.deleted_at IS NULL
          ORDER BY note_values.note_id ASC
        `
        )
        .all(columnId) as Array<{ id: string }>
    ).map((row) => row.id)
    const deleteValues = database.transaction(() => {
      const changes = database
        .prepare('DELETE FROM note_values WHERE column_id = ?')
        .run(columnId).changes

      refreshNoteMutationMetadata(database, noteIds, timestamp)

      return changes
    })

    return deleteValues()
  }

  private tombstoneNotes(noteIds: string[], timestamp: string): number {
    if (noteIds.length === 0) {
      return 0
    }

    const database = this.getDatabase()
    const tombstoneNote = database.prepare(`
      UPDATE notes
      SET updated_at = @deletedAt,
          mutation_id = @mutationId,
          modified_by_device_id = @modifiedByDeviceId,
          modified_at = @modifiedAt,
          deleted_at = @deletedAt,
          deletion_mutation_id = @mutationId,
          deletion_device_id = @modifiedByDeviceId
      WHERE id = @id AND deleted_at IS NULL
    `)
    const applyTombstones = database.transaction(() => {
      let deletedCount = 0

      for (const id of noteIds) {
        const mutation = createLocalMutationMetadata(database, timestamp)
        const result = tombstoneNote.run({
          id,
          deletedAt: timestamp,
          ...mutation,
        })
        deletedCount += result.changes

        if (result.changes > 0) {
          enqueueNoteSyncMutation(database, id, mutation, true)
        }
      }

      return deletedCount
    })

    return applyTombstones()
  }

  private getSortColumn(sortBy: NoteSortFieldEnum): string {
    switch (sortBy) {
      case NoteSortFieldEnum.CreatedAt:
        return 'created_at'
      case NoteSortFieldEnum.UpdatedAt:
        return 'updated_at'
      default:
        return 'created_at'
    }
  }

  private findNoteRows<TIncludeDeleted extends boolean>(
    noteTypeIds: string[] | undefined,
    sortColumn: string,
    sortDirection: 'ASC' | 'DESC',
    includeDeleted: TIncludeDeleted
  ): TIncludeDeleted extends true ? Array<Note & SyncEntityMetadata> : Note[] {
    const deletedFilter = includeDeleted ? '' : 'deleted_at IS NULL'
    const typeFilter = noteTypeIds?.length
      ? `note_type_id IN (${noteTypeIds.map(() => '?').join(', ')})`
      : ''
    const whereClause = [typeFilter, deletedFilter]
      .filter(Boolean)
      .join(' AND ')
    const rows = this.getDatabase()
      .prepare(
        `SELECT * FROM notes ${whereClause ? `WHERE ${whereClause}` : ''}
         ORDER BY ${sortColumn} ${sortDirection}, id ASC`
      )
      .all(...(noteTypeIds ?? [])) as NoteRow[]

    return rows.map((row) =>
      includeDeleted ? this.mapSyncNoteRow(row) : this.mapNoteRow(row)
    ) as TIncludeDeleted extends true
      ? Array<Note & SyncEntityMetadata>
      : Note[]
  }

  private attachValues<TNote extends Note>(notes: TNote[]): TNote[] {
    if (notes.length === 0) {
      return []
    }

    const valuesByNoteId = this.findValuesByNoteIds(
      notes.map((note) => note.id)
    )

    return notes.map((note) => ({
      ...note,
      values: valuesByNoteId.get(note.id) ?? {},
    }))
  }

  private upsertValues(
    noteId: string,
    values: NoteValues,
    timestamp: string
  ): void {
    const upsertValue = this.getDatabase().prepare(`
      INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at)
      VALUES (@noteId, @columnId, @valueJson, @createdAt, @updatedAt)
      ON CONFLICT(note_id, column_id) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `)

    for (const [columnId, value] of Object.entries(values)) {
      upsertValue.run({
        noteId,
        columnId,
        valueJson: JSON.stringify(value),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
  }

  private applyValuePatch(
    noteId: string,
    values: NoteValuePatch,
    timestamp: string
  ): void {
    const valuesToUpsert: NoteValues = {}
    const deleteValue = this.getDatabase().prepare(
      'DELETE FROM note_values WHERE note_id = ? AND column_id = ?'
    )

    for (const [columnId, value] of Object.entries(values)) {
      if (value === null) {
        deleteValue.run(noteId, columnId)
      } else {
        valuesToUpsert[columnId] = value
      }
    }

    this.upsertValues(noteId, valuesToUpsert, timestamp)
  }

  private findValuesByNoteIds(noteIds: string[]): Map<string, NoteValues> {
    const placeholders = noteIds.map(() => '?').join(', ')
    const rows = this.getDatabase()
      .prepare(
        `SELECT * FROM note_values WHERE note_id IN (${placeholders}) ORDER BY column_id ASC`
      )
      .all(...noteIds) as NoteValueRow[]
    const valuesByNoteId = new Map<string, NoteValues>()

    for (const row of rows) {
      const values = valuesByNoteId.get(row.note_id) ?? {}
      values[row.column_id] = this.parseValue(row.value_json)
      valuesByNoteId.set(row.note_id, values)
    }

    return valuesByNoteId
  }

  private findValuesByNoteId(noteId: string): NoteValues {
    const rows = this.getDatabase()
      .prepare(
        'SELECT * FROM note_values WHERE note_id = ? ORDER BY column_id ASC'
      )
      .all(noteId) as NoteValueRow[]

    return rows.reduce<NoteValues>((values, row) => {
      values[row.column_id] = this.parseValue(row.value_json)

      return values
    }, {})
  }

  private parseValue(valueJson: string | null): NoteValue {
    return valueJson === null ? '' : (JSON.parse(valueJson) as NoteValue)
  }

  private mapNoteRow(row: NoteRow): Note {
    return {
      id: row.id,
      noteTypeId: row.note_type_id,
      background: row.background,
      values: {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapSyncNoteRow(row: NoteRow): Note & SyncEntityMetadata {
    return {
      ...this.mapNoteRow(row),
      mutationId: row.mutation_id,
      modifiedByDeviceId: row.modified_by_device_id,
      modifiedAt: row.modified_at,
      deletedAt: row.deleted_at,
      deletionMutationId: row.deletion_mutation_id,
      deletionDeviceId: row.deletion_device_id,
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
