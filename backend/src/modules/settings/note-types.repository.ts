import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import type { SyncEntityMetadata } from '../sync/types/sync-entity-metadata'
import { createLocalMutationMetadata } from '../sync/utils/create-local-mutation-metadata.util'
import { enqueueConfigurationSyncMutation } from '../sync/utils/enqueue-configuration-sync-mutation.util'
import { defaultNoteTypeTitle } from './constants/default-note-type'
import type { NoteType } from './types/note-type'

interface NoteTypeRow {
  id: string
  title: string
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
export class NoteTypesRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findAll(): NoteType[] {
    return this.getDatabase()
      .prepare(
        'SELECT * FROM note_types WHERE deleted_at IS NULL ORDER BY created_at ASC, id ASC'
      )
      .all()
      .map((row) => this.mapNoteTypeRow(row as NoteTypeRow))
  }

  findAllIncludingDeleted(): Array<NoteType & SyncEntityMetadata> {
    return this.getDatabase()
      .prepare('SELECT * FROM note_types ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => this.mapSyncNoteTypeRow(row as NoteTypeRow))
  }

  findById(id: string): NoteType | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_types WHERE id = ? AND deleted_at IS NULL')
      .get(id) as NoteTypeRow | undefined

    return row ? this.mapNoteTypeRow(row) : undefined
  }

  findByTitle(title: string): NoteType | undefined {
    const row = this.getDatabase()
      .prepare(
        'SELECT * FROM note_types WHERE title = ? AND deleted_at IS NULL'
      )
      .get(title) as NoteTypeRow | undefined

    return row ? this.mapNoteTypeRow(row) : undefined
  }

  findPreferred(): NoteType | undefined {
    return this.findByTitle(defaultNoteTypeTitle) ?? this.findFirst()
  }

  count(): number {
    const row = this.getDatabase()
      .prepare(
        'SELECT COUNT(*) as count FROM note_types WHERE deleted_at IS NULL'
      )
      .get() as { count: number }

    return row.count
  }

  ensureDefaultExists(): NoteType {
    const defaultNoteType = this.findByTitle(defaultNoteTypeTitle)

    return (
      defaultNoteType ??
      this.create({
        id: uuidV4(),
        title: defaultNoteTypeTitle,
      })
    )
  }

  create(input: { id?: string; title: string }): NoteType {
    const database = this.getDatabase()
    const id = input.id ?? uuidV4()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const createNoteType = database.transaction(() => {
      database
        .prepare(
          `
          INSERT INTO note_types (
            id, title, created_at, updated_at, mutation_id,
            modified_by_device_id, modified_at
          ) VALUES (
            @id, @title, @createdAt, @updatedAt, @mutationId,
            @modifiedByDeviceId, @modifiedAt
          )
        `
        )
        .run({
          id,
          title: input.title,
          createdAt: timestamp,
          updatedAt: timestamp,
          ...mutation,
        })
      enqueueConfigurationSyncMutation(database, mutation)
    })

    createNoteType()

    return this.findById(id) as NoteType
  }

  updateTitle(id: string, title: string): NoteType {
    const database = this.getDatabase()
    const timestamp = new Date().toISOString()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const updateNoteType = database.transaction(() => {
      const result = database
        .prepare(
          `
          UPDATE note_types
          SET title = @title,
              updated_at = @updatedAt,
              mutation_id = @mutationId,
              modified_by_device_id = @modifiedByDeviceId,
              modified_at = @modifiedAt
          WHERE id = @id AND deleted_at IS NULL
        `
        )
        .run({ id, title, updatedAt: timestamp, ...mutation })

      if (result.changes > 0) {
        enqueueConfigurationSyncMutation(database, mutation)
      }
    })

    updateNoteType()

    return this.findById(id) as NoteType
  }

  delete(id: string, timestamp: string): boolean {
    const database = this.getDatabase()
    const mutation = createLocalMutationMetadata(database, timestamp)
    const deleteNoteType = database.transaction(() => {
      const result = database
        .prepare(
          `
          UPDATE note_types
          SET updated_at = @deletedAt,
              mutation_id = @mutationId,
              modified_by_device_id = @modifiedByDeviceId,
              modified_at = @modifiedAt,
              deleted_at = @deletedAt,
              deletion_mutation_id = @mutationId,
              deletion_device_id = @modifiedByDeviceId
          WHERE id = @id AND deleted_at IS NULL
        `
        )
        .run({ id, deletedAt: timestamp, ...mutation })

      if (result.changes > 0) {
        enqueueConfigurationSyncMutation(database, mutation)
      }

      return result.changes > 0
    })

    return deleteNoteType()
  }

  private findFirst(): NoteType | undefined {
    const row = this.getDatabase()
      .prepare(
        'SELECT * FROM note_types WHERE deleted_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 1'
      )
      .get() as NoteTypeRow | undefined

    return row ? this.mapNoteTypeRow(row) : undefined
  }

  private mapNoteTypeRow(row: NoteTypeRow): NoteType {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapSyncNoteTypeRow(row: NoteTypeRow): NoteType & SyncEntityMetadata {
    return {
      ...this.mapNoteTypeRow(row),
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
