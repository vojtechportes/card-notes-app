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

  findByTitle(title: string): NoteType | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_types WHERE title = ?')
      .get(title) as NoteTypeRow | undefined

    return row ? this.mapNoteTypeRow(row) : undefined
  }

  findPreferred(): NoteType | undefined {
    return this.findByTitle(defaultNoteTypeTitle) ?? this.findFirst()
  }

  count(): number {
    const row = this.getDatabase()
      .prepare('SELECT COUNT(*) as count FROM note_types')
      .get() as { count: number }

    return row.count
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

  create(input: { id?: string; title: string }): NoteType {
    const id = input.id ?? uuidV4()

    this.getDatabase()
      .prepare(
        `
        INSERT INTO note_types (id, title)
        VALUES (@id, @title)
      `
      )
      .run({
        id,
        title: input.title,
      })

    return this.findById(id) as NoteType
  }

  updateTitle(id: string, title: string): NoteType {
    this.getDatabase()
      .prepare(
        `
        UPDATE note_types
        SET title = @title,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `
      )
      .run({ id, title })

    return this.findById(id) as NoteType
  }

  delete(id: string): void {
    this.getDatabase().prepare('DELETE FROM note_types WHERE id = ?').run(id)
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
