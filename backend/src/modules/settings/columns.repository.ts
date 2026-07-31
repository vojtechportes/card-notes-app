import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import { refreshNoteMutationMetadata } from '../notes/utils/refresh-note-mutation-metadata.util'
import type { SyncEntityMetadata } from '../sync/types/sync-entity-metadata'
import { createLocalMutationMetadata } from '../sync/utils/create-local-mutation-metadata.util'
import { enqueueConfigurationSyncMutation } from '../sync/utils/enqueue-configuration-sync-mutation.util'
import type { DefaultNoteColumnDefinition } from './constants/default-note-columns'
import { ColumnTypeEnum } from './types/column-type-enum'
import type { NoteColumn } from './types/note-column'

interface NoteColumnRow {
  id: string
  note_type_id: string
  name: string
  title: string
  type: string
  sort_order: number
  is_hidden: number
  is_hidden_in_detail: number
  is_default: number
  config_json: string | null
  created_at: string
  updated_at: string
  mutation_id: string
  modified_by_device_id: string
  modified_at: string
  deleted_at: string | null
  deletion_mutation_id: string | null
  deletion_device_id: string | null
}

interface SortOrderRow {
  sort_order: number
}

interface DeleteColumnOptions {
  deleteNoteData?: boolean
}

@Injectable()
export class ColumnsRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  getDatabaseService(): DatabaseService {
    return this.databaseService
  }

  ensureDefaultColumns(
    noteTypeId: string,
    defaultColumns: DefaultNoteColumnDefinition[]
  ): void {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const findExistingColumn = database.prepare(`
      SELECT id FROM note_columns
      WHERE note_type_id = ? AND name = ? AND deleted_at IS NULL
      LIMIT 1
    `)
    const insertDefaultColumn = database.prepare(`
      INSERT INTO note_columns (
        id, note_type_id, name, title, type, sort_order, is_hidden,
        is_hidden_in_detail, is_default, config_json, created_at, updated_at,
        mutation_id, modified_by_device_id, modified_at
      ) VALUES (
        @id, @noteTypeId, @name, @title, @type, @sortOrder, 0,
        0, 1, NULL, @createdAt, @updatedAt,
        @mutationId, @modifiedByDeviceId, @modifiedAt
      )
    `)
    const markAsDefault = database.prepare(`
      UPDATE note_columns
      SET title = @title,
          type = @type,
          sort_order = @sortOrder,
          is_default = 1,
          updated_at = @updatedAt,
          mutation_id = @mutationId,
          modified_by_device_id = @modifiedByDeviceId,
          modified_at = @modifiedAt
      WHERE note_type_id = @noteTypeId
        AND name = @name
        AND deleted_at IS NULL
        AND (
          title != @title OR type != @type OR sort_order != @sortOrder OR
          is_default != 1
        )
    `)
    const seedDefaultColumns = database.transaction(() => {
      let latestMutation:
        ReturnType<typeof createLocalMutationMetadata> | undefined

      for (const column of defaultColumns) {
        const existing = findExistingColumn.get(noteTypeId, column.name) as
          { id: string } | undefined
        const mutation = createLocalMutationMetadata(database, timestamp)

        if (!existing) {
          insertDefaultColumn.run({
            id: uuidV4(),
            noteTypeId,
            name: column.name,
            title: column.title,
            type: column.type,
            sortOrder: column.sortOrder,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...mutation,
          })
          latestMutation = mutation
          continue
        }

        const result = markAsDefault.run({
          noteTypeId,
          name: column.name,
          title: column.title,
          type: column.type,
          sortOrder: column.sortOrder,
          updatedAt: timestamp,
          ...mutation,
        })
        if (result.changes > 0) {
          latestMutation = mutation
        }
      }

      if (latestMutation) {
        enqueueConfigurationSyncMutation(database, latestMutation)
      }
    })

    seedDefaultColumns()
  }

  findAll(noteTypeId?: string): NoteColumn[] {
    const whereClause = noteTypeId
      ? 'WHERE note_type_id = ? AND deleted_at IS NULL'
      : 'WHERE deleted_at IS NULL'

    return this.getDatabase()
      .prepare(
        `SELECT * FROM note_columns ${whereClause}
         ORDER BY sort_order ASC, title ASC, id ASC`
      )
      .all(...(noteTypeId ? [noteTypeId] : []))
      .map((row) => this.mapColumnRow(row as NoteColumnRow))
  }

  findAllIncludingDeleted(): Array<NoteColumn & SyncEntityMetadata> {
    return this.getDatabase()
      .prepare(
        'SELECT * FROM note_columns ORDER BY sort_order ASC, title ASC, id ASC'
      )
      .all()
      .map((row) => this.mapSyncColumnRow(row as NoteColumnRow))
  }

  findById(id: string): NoteColumn | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_columns WHERE id = ? AND deleted_at IS NULL')
      .get(id) as NoteColumnRow | undefined

    return row ? this.mapColumnRow(row) : undefined
  }

  findByName(name: string, noteTypeId: string): NoteColumn | undefined {
    const row = this.getDatabase()
      .prepare(
        `
        SELECT * FROM note_columns
        WHERE note_type_id = ? AND name = ? AND deleted_at IS NULL
      `
      )
      .get(noteTypeId, name) as NoteColumnRow | undefined

    return row ? this.mapColumnRow(row) : undefined
  }

  getNextSortOrder(noteTypeId: string): number {
    const row = this.getDatabase()
      .prepare(
        `
        SELECT COALESCE(MAX(sort_order) + 1, 0) as sort_order
        FROM note_columns
        WHERE note_type_id = ? AND deleted_at IS NULL
      `
      )
      .get(noteTypeId) as SortOrderRow | undefined

    return row?.sort_order ?? 0
  }

  create(column: Omit<NoteColumn, 'createdAt' | 'updatedAt'>): NoteColumn {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const createColumn = database.transaction(() => {
      database
        .prepare(
          `
          INSERT INTO note_columns (
            id, note_type_id, name, title, type, sort_order, is_hidden,
            is_hidden_in_detail, is_default, config_json, created_at, updated_at,
            mutation_id, modified_by_device_id, modified_at
          ) VALUES (
            @id, @noteTypeId, @name, @title, @type, @sortOrder, @isHidden,
            @isHiddenInDetail, @isDefault, @configJson, @createdAt, @updatedAt,
            @mutationId, @modifiedByDeviceId, @modifiedAt
          )
        `
        )
        .run({
          ...this.mapColumnParameters(column),
          createdAt: timestamp,
          updatedAt: timestamp,
          ...mutation,
        })
      enqueueConfigurationSyncMutation(database, mutation)
    })

    createColumn()

    return this.findById(column.id) as NoteColumn
  }
  update(column: NoteColumn): NoteColumn {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const updateColumn = database.transaction(() => {
      const result = database
        .prepare(
          `
          UPDATE note_columns
          SET note_type_id = @noteTypeId,
              name = @name,
              title = @title,
              type = @type,
              sort_order = @sortOrder,
              is_hidden = @isHidden,
              is_hidden_in_detail = @isHiddenInDetail,
              is_default = @isDefault,
              config_json = @configJson,
              updated_at = @updatedAt,
              mutation_id = @mutationId,
              modified_by_device_id = @modifiedByDeviceId,
              modified_at = @modifiedAt
          WHERE id = @id AND deleted_at IS NULL
        `
        )
        .run({
          ...this.mapColumnParameters(column),
          updatedAt: timestamp,
          ...mutation,
        })

      if (result.changes > 0) {
        enqueueConfigurationSyncMutation(database, mutation)
      }
    })

    updateColumn()

    return this.findById(column.id) as NoteColumn
  }
  updateSortOrders(columnIds: string[]): void {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const updateSortOrder = database.prepare(`
      UPDATE note_columns
      SET sort_order = @sortOrder,
          updated_at = @updatedAt,
          mutation_id = @mutationId,
          modified_by_device_id = @modifiedByDeviceId,
          modified_at = @modifiedAt
      WHERE id = @id AND deleted_at IS NULL
    `)
    const applySortOrders = database.transaction(() => {
      let changed = false
      columnIds.forEach((id, sortOrder) => {
        changed =
          updateSortOrder.run({
            id,
            sortOrder,
            updatedAt: timestamp,
            ...mutation,
          }).changes > 0 || changed
      })

      if (changed) {
        enqueueConfigurationSyncMutation(database, mutation)
      }
    })

    applySortOrders()
  }
  delete(
    id: string,
    options: DeleteColumnOptions = {},
    timestamp = new Date().toISOString()
  ): boolean {
    const database = this.getDatabase()
    const deleteWithOptionalValues = database.transaction(() => {
      if (options.deleteNoteData) {
        const noteIds = this.findLiveNoteIdsWithColumnValue(id)
        database.prepare('DELETE FROM note_values WHERE column_id = ?').run(id)
        refreshNoteMutationMetadata(database, noteIds, timestamp)
      }

      return this.tombstoneColumns([id], timestamp) > 0
    })

    return deleteWithOptionalValues()
  }

  deleteByNoteTypeId(noteTypeId: string, timestamp: string): number {
    const columnIds = (
      this.getDatabase()
        .prepare(
          `
          SELECT id FROM note_columns
          WHERE note_type_id = ? AND deleted_at IS NULL
          ORDER BY id ASC
        `
        )
        .all(noteTypeId) as Array<{ id: string }>
    ).map((row) => row.id)

    return this.tombstoneColumns(columnIds, timestamp)
  }

  private tombstoneColumns(columnIds: string[], timestamp: string): number {
    const database = this.getDatabase()
    const tombstoneColumn = database.prepare(`
      UPDATE note_columns
      SET updated_at = @deletedAt,
          mutation_id = @mutationId,
          modified_by_device_id = @modifiedByDeviceId,
          modified_at = @modifiedAt,
          deleted_at = @deletedAt,
          deletion_mutation_id = @mutationId,
          deletion_device_id = @modifiedByDeviceId
      WHERE id = @id AND deleted_at IS NULL
    `)
    let deletedCount = 0
    let latestMutation:
      ReturnType<typeof createLocalMutationMetadata> | undefined

    for (const id of columnIds) {
      const mutation = createLocalMutationMetadata(database, timestamp)
      const result = tombstoneColumn.run({
        id,
        deletedAt: timestamp,
        ...mutation,
      })
      deletedCount += result.changes
      if (result.changes > 0) {
        latestMutation = mutation
      }
    }

    if (latestMutation) {
      enqueueConfigurationSyncMutation(database, latestMutation)
    }

    return deletedCount
  }
  private findLiveNoteIdsWithColumnValue(columnId: string): string[] {
    return (
      this.getDatabase()
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
  }

  private mapColumnParameters(
    column: Omit<NoteColumn, 'createdAt' | 'updatedAt'>
  ): Record<string, unknown> {
    return {
      id: column.id,
      noteTypeId: column.noteTypeId,
      name: column.name,
      title: column.title,
      type: column.type,
      sortOrder: column.sortOrder,
      isHidden: column.isHidden ? 1 : 0,
      isHiddenInDetail: column.isHiddenInDetail ? 1 : 0,
      isDefault: column.isDefault ? 1 : 0,
      configJson: column.config ? JSON.stringify(column.config) : null,
    }
  }

  private mapColumnRow(row: NoteColumnRow): NoteColumn {
    return {
      id: row.id,
      noteTypeId: row.note_type_id,
      name: row.name,
      title: row.title,
      type: row.type as ColumnTypeEnum,
      sortOrder: row.sort_order,
      isHidden: Boolean(row.is_hidden),
      isHiddenInDetail: Boolean(row.is_hidden_in_detail),
      isDefault: Boolean(row.is_default),
      config: row.config_json
        ? (JSON.parse(row.config_json) as Record<string, unknown>)
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapSyncColumnRow(
    row: NoteColumnRow
  ): NoteColumn & SyncEntityMetadata {
    return {
      ...this.mapColumnRow(row),
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
