import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import { refreshNoteMutationMetadata } from '../notes/utils/refresh-note-mutation-metadata.util'
import type { SyncEntityMetadata } from '../sync/types/sync-entity-metadata'
import { createLocalMutationMetadata } from '../sync/utils/create-local-mutation-metadata.util'
import { enqueueConfigurationSyncMutation } from '../sync/utils/enqueue-configuration-sync-mutation.util'
import type { Label } from './types/label'

interface LabelRow {
  id: string
  title: string
  name: string
  color: string
  note_type_id: string | null
  created_at: string
  updated_at: string
  mutation_id: string
  modified_by_device_id: string
  modified_at: string
  deleted_at: string | null
  deletion_mutation_id: string | null
  deletion_device_id: string | null
}

@Injectable()
export class LabelsRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findAll(): Label[] {
    return this.getDatabase()
      .prepare(
        'SELECT * FROM labels WHERE deleted_at IS NULL ORDER BY created_at ASC, id ASC'
      )
      .all()
      .map((row) => this.mapLabelRow(row as LabelRow))
  }

  findAllIncludingDeleted(): Array<Label & SyncEntityMetadata> {
    return this.getDatabase()
      .prepare('SELECT * FROM labels ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => this.mapSyncLabelRow(row as LabelRow))
  }

  findById(id: string): Label | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM labels WHERE id = ? AND deleted_at IS NULL')
      .get(id) as LabelRow | undefined

    return row ? this.mapLabelRow(row) : undefined
  }

  findBySourceAndName(
    noteTypeId: string | null,
    name: string
  ): Label | undefined {
    const sourceFilter =
      noteTypeId === null ? 'note_type_id IS NULL' : 'note_type_id = ?'
    const row = this.getDatabase()
      .prepare(
        `
        SELECT * FROM labels
        WHERE ${sourceFilter} AND name = ? AND deleted_at IS NULL
      `
      )
      .get(...(noteTypeId === null ? [name] : [noteTypeId, name])) as
      LabelRow | undefined

    return row ? this.mapLabelRow(row) : undefined
  }

  create(input: {
    title: string
    name: string
    color: string
    noteTypeId: string | null
  }): Label {
    const database = this.getDatabase()
    const id = uuidV4()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const createLabel = database.transaction(() => {
      database
        .prepare(
          `
          INSERT INTO labels (
            id, title, name, color, note_type_id, created_at, updated_at,
            mutation_id, modified_by_device_id, modified_at
          ) VALUES (
            @id, @title, @name, @color, @noteTypeId, @createdAt, @updatedAt,
            @mutationId, @modifiedByDeviceId, @modifiedAt
          )
        `
        )
        .run({
          id,
          ...input,
          createdAt: timestamp,
          updatedAt: timestamp,
          ...mutation,
        })
      enqueueConfigurationSyncMutation(database, mutation)
    })

    createLabel()

    return this.findById(id) as Label
  }
  update(
    id: string,
    input: {
      title: string
      name: string
      color: string
      noteTypeId: string | null
    }
  ): Label | undefined {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const updateLabel = database.transaction(() => {
      const result = database
        .prepare(
          `
          UPDATE labels
          SET title = @title,
              name = @name,
              color = @color,
              note_type_id = @noteTypeId,
              updated_at = @updatedAt,
              mutation_id = @mutationId,
              modified_by_device_id = @modifiedByDeviceId,
              modified_at = @modifiedAt
          WHERE id = @id AND deleted_at IS NULL
        `
        )
        .run({ id, ...input, updatedAt: timestamp, ...mutation })

      if (result.changes > 0) {
        enqueueConfigurationSyncMutation(database, mutation)
      }
    })

    updateLabel()

    return this.findById(id)
  }
  deleteWithValueCleanup(id: string): boolean {
    return this.deleteWithValueCleanupAndCount(id).deleted
  }

  deleteWithValueCleanupAndCount(id: string): {
    deleted: boolean
    affectedNoteValuesCount: number
  } {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const deleteLabel = database.transaction(() => {
      const affectedNoteValuesCount = this.pruneLabelIdsFromNoteValues(
        [id],
        timestamp
      )
      const deleted = this.tombstoneLabels([id], timestamp) > 0

      return { deleted, affectedNoteValuesCount }
    })

    return deleteLabel()
  }

  deleteByNoteTypeIdWithValueCleanup(
    noteTypeId: string,
    timestamp = new Date().toISOString()
  ): number {
    const database = this.getDatabase()
    const deleteLabels = database.transaction(() => {
      const labelIds = (
        database
          .prepare(
            `
            SELECT id FROM labels
            WHERE note_type_id = ? AND deleted_at IS NULL
            ORDER BY id ASC
          `
          )
          .all(noteTypeId) as Array<{ id: string }>
      ).map((row) => row.id)

      this.pruneLabelIdsFromNoteValues(labelIds, timestamp)

      return this.tombstoneLabels(labelIds, timestamp)
    })

    return deleteLabels()
  }

  private pruneLabelIdsFromNoteValues(
    labelIds: string[],
    timestamp: string
  ): number {
    if (labelIds.length === 0) {
      return 0
    }

    const database = this.getDatabase()
    const labelIdSet = new Set(labelIds)
    const rows = database
      .prepare(
        `
        SELECT note_values.note_id, note_values.column_id, note_values.value_json
        FROM note_values
        INNER JOIN note_columns ON note_columns.id = note_values.column_id
        INNER JOIN notes ON notes.id = note_values.note_id
        WHERE note_columns.type = 'labels'
          AND note_columns.deleted_at IS NULL
          AND notes.deleted_at IS NULL
      `
      )
      .all() as Array<{
      note_id: string
      column_id: string
      value_json: string | null
    }>
    const updateValue = database.prepare(`
      UPDATE note_values
      SET value_json = ?, updated_at = ?
      WHERE note_id = ? AND column_id = ?
    `)
    const affectedNoteIds = new Set<string>()
    let affectedNoteValuesCount = 0

    for (const row of rows) {
      const value = this.parseLabelIds(row.value_json)

      if (!value) {
        continue
      }

      const nextValue = value.filter((labelId) => !labelIdSet.has(labelId))

      if (nextValue.length === value.length) {
        continue
      }

      updateValue.run(
        JSON.stringify(nextValue),
        timestamp,
        row.note_id,
        row.column_id
      )
      affectedNoteIds.add(row.note_id)
      affectedNoteValuesCount += 1
    }

    refreshNoteMutationMetadata(database, [...affectedNoteIds], timestamp)

    return affectedNoteValuesCount
  }

  private tombstoneLabels(labelIds: string[], timestamp: string): number {
    const database = this.getDatabase()
    const tombstoneLabel = database.prepare(`
      UPDATE labels
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

    for (const id of labelIds) {
      const mutation = createLocalMutationMetadata(database, timestamp)
      const result = tombstoneLabel.run({
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
  private parseLabelIds(valueJson: string | null): string[] | undefined {
    if (valueJson === null) {
      return undefined
    }

    try {
      const value: unknown = JSON.parse(valueJson)

      return Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
        ? value
        : undefined
    } catch {
      return undefined
    }
  }

  private mapLabelRow(row: LabelRow): Label {
    return {
      id: row.id,
      title: row.title,
      name: row.name,
      color: row.color,
      noteTypeId: row.note_type_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapSyncLabelRow(row: LabelRow): Label & SyncEntityMetadata {
    return {
      ...this.mapLabelRow(row),
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
