import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import { defaultNoteTypeTitle } from './constants/default-note-type'
import type { NoteType } from './types/note-type'

interface NoteTypeRow {
  id: string
  title: string
  created_at: string
  updated_at: string
}

@Injectable()
export class NoteTypesRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findAll(): NoteType[] {
    return this.getDatabase()
      .prepare('SELECT * FROM note_types ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => this.mapNoteTypeRow(row as NoteTypeRow))
  }

  findById(id: string): NoteType | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_types WHERE id = ?')
      .get(id) as NoteTypeRow | undefined

    return row ? this.mapNoteTypeRow(row) : undefined
  }

  findPreferred(): NoteType | undefined {
    return this.findByTitle(defaultNoteTypeTitle) ?? this.findFirst()
  }

  ensureDefaultExists(): NoteType {
    const defaultNoteType = this.findByTitle(defaultNoteTypeTitle)

    if (defaultNoteType) {
      return defaultNoteType
    }

    return this.create({
      id: uuidV4(),
      title: defaultNoteTypeTitle,
    })
  }

  private create(input: Pick<NoteType, 'id' | 'title'>): NoteType {
    this.getDatabase()
      .prepare(
        `
        INSERT INTO note_types (id, title)
        VALUES (@id, @title)
      `
      )
      .run(input)

    return this.findById(input.id) as NoteType
  }

  private findByTitle(title: string): NoteType | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_types WHERE title = ?')
      .get(title) as NoteTypeRow | undefined

    return row ? this.mapNoteTypeRow(row) : undefined
  }

  private findFirst(): NoteType | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_types ORDER BY created_at ASC, id ASC LIMIT 1')
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

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
