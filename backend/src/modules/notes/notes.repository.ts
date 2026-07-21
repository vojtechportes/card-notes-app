import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'
import type { Note } from './types/note'
import { NoteSortDirectionEnum } from './types/note-sort-direction-enum'
import { NoteSortFieldEnum } from './types/note-sort-field-enum'
import type { ListNotesOptions } from './types/list-notes-options'
import type { NoteValue, NoteValuePatch, NoteValues } from './types/note-value'

interface NoteRow {
  id: string
  note_type_id: string
  created_at: string
  updated_at: string
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
    const insertNote = database.prepare(`
      INSERT INTO notes (id, note_type_id, created_at, updated_at)
      VALUES (@id, @noteTypeId, @createdAt, @updatedAt)
    `)
    const createNote = database.transaction(
      (noteId: string, typeId: string, noteValues: NoteValues) => {
        insertNote.run({
          id: noteId,
          noteTypeId: typeId,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        this.upsertValues(noteId, noteValues, timestamp)
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
      sortDirection
    )

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

  findById(id: string): Note | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(id) as NoteRow | undefined

    if (!row) {
      return undefined
    }

    return {
      ...this.mapNoteRow(row),
      values: this.findValuesByNoteId(id),
    }
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
    const updateNote = database.prepare(
      'UPDATE notes SET updated_at = @updatedAt WHERE id = @id'
    )
    const updateNoteValues = database.transaction(
      (noteId: string, noteValues: NoteValuePatch) => {
        this.applyValuePatch(noteId, noteValues, timestamp)
        updateNote.run({ id: noteId, updatedAt: timestamp })
      }
    )

    updateNoteValues(id, values)

    return this.findById(id)
  }

  delete(id: string): boolean {
    const result = this.getDatabase()
      .prepare('DELETE FROM notes WHERE id = ?')
      .run(id)

    return result.changes > 0
  }

  deleteAll(): number {
    return this.getDatabase().prepare('DELETE FROM notes').run().changes
  }

  deleteByNoteTypeId(noteTypeId: string): number {
    return this.getDatabase()
      .prepare('DELETE FROM notes WHERE note_type_id = ?')
      .run(noteTypeId).changes
  }

  moveNotesToType(options: MoveNotesToTypeOptions): number {
    const database = this.getDatabase()
    const noteIds = (
      database
        .prepare('SELECT id FROM notes WHERE note_type_id = ? ORDER BY id ASC')
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
          const upsertTransformedValue = database.prepare(
            `
            INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(note_id, column_id) DO UPDATE SET
              value_json = excluded.value_json,
              updated_at = excluded.updated_at
          `
          )

          for (const sourceRow of sourceRows) {
            const transformedValue = fieldMapping.transformValue(
              this.parseValue(sourceRow.value_json)
            )

            upsertTransformedValue.run(
              sourceRow.note_id,
              fieldMapping.targetColumnId,
              JSON.stringify(transformedValue),
              options.timestamp,
              options.timestamp
            )
          }

          continue
        }

        database
          .prepare(
            `
            INSERT INTO note_values (note_id, column_id, value_json, created_at, updated_at)
            SELECT note_id, ?, value_json, ?, ?
            FROM note_values
            WHERE note_id IN (${noteIdPlaceholders})
              AND column_id = ?
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

      database
        .prepare(
          `
          UPDATE notes
          SET note_type_id = ?,
              updated_at = ?
          WHERE id IN (${noteIdPlaceholders})
        `
        )
        .run(options.targetNoteTypeId, options.timestamp, ...noteIds)

      if (options.sourceColumnIds.length > 0) {
        const sourceColumnPlaceholders = options.sourceColumnIds
          .map(() => '?')
          .join(', ')

        database
          .prepare(
            `
            DELETE FROM note_values
            WHERE note_id IN (${noteIdPlaceholders})
              AND column_id IN (${sourceColumnPlaceholders})
          `
          )
          .run(...noteIds, ...options.sourceColumnIds)
      }
    })

    copyMappedValues()

    return noteIds.length
  }
  hasMultipleLabelValuesForColumn(columnId: string): boolean {
    const rows = this.getDatabase()
      .prepare('SELECT value_json FROM note_values WHERE column_id = ?')
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

  deleteValuesForColumn(columnId: string): number {
    return this.getDatabase()
      .prepare('DELETE FROM note_values WHERE column_id = ?')
      .run(columnId).changes
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

  private findNoteRows(
    noteTypeIds: string[] | undefined,
    sortColumn: string,
    sortDirection: 'ASC' | 'DESC'
  ): Note[] {
    const database = this.getDatabase()

    if (!noteTypeIds || noteTypeIds.length === 0) {
      return database
        .prepare(
          `SELECT * FROM notes ORDER BY ${sortColumn} ${sortDirection}, id ASC`
        )
        .all()
        .map((row) => this.mapNoteRow(row as NoteRow))
    }

    const placeholders = noteTypeIds.map(() => '?').join(', ')

    return database
      .prepare(
        `SELECT * FROM notes WHERE note_type_id IN (${placeholders}) ORDER BY ${sortColumn} ${sortDirection}, id ASC`
      )
      .all(...noteTypeIds)
      .map((row) => this.mapNoteRow(row as NoteRow))
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
    if (valueJson === null) {
      return ''
    }

    return JSON.parse(valueJson) as NoteValue
  }

  private mapNoteRow(row: NoteRow): Note {
    return {
      id: row.id,
      noteTypeId: row.note_type_id,
      values: {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
