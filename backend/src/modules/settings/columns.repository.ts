import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../database/database.service'
import type { DefaultNoteColumn } from './constants/default-note-columns'
import { ColumnTypeEnum } from './types/column-type-enum'
import type { NoteColumn } from './types/note-column'

interface NoteColumnRow {
  id: string
  name: string
  title: string
  type: string
  sort_order: number
  is_hidden: number
  is_default: number
  config_json: string | null
  created_at: string
  updated_at: string
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

  ensureDefaultColumns(defaultColumns: DefaultNoteColumn[]): void {
    const database = this.getDatabase()
    const insertDefaultColumn = database.prepare(`
      INSERT OR IGNORE INTO note_columns (
        id,
        name,
        title,
        type,
        sort_order,
        is_hidden,
        is_default,
        config_json
      ) VALUES (
        @id,
        @name,
        @title,
        @type,
        @sortOrder,
        0,
        1,
        NULL
      )
    `)
    const markAsDefault = database.prepare(`
      UPDATE note_columns
      SET type = @type,
          is_default = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE name = @name
        AND (type != @type OR is_default != 1)
    `)

    const seedDefaultColumns = database.transaction(
      (columns: DefaultNoteColumn[]) => {
        for (const column of columns) {
          insertDefaultColumn.run(column)
          markAsDefault.run(column)
        }
      }
    )

    seedDefaultColumns(defaultColumns)
  }

  findAll(): NoteColumn[] {
    return this.getDatabase()
      .prepare('SELECT * FROM note_columns ORDER BY sort_order ASC, title ASC')
      .all()
      .map((row) => this.mapColumnRow(row as NoteColumnRow))
  }

  findById(id: string): NoteColumn | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_columns WHERE id = ?')
      .get(id) as NoteColumnRow | undefined

    return row ? this.mapColumnRow(row) : undefined
  }

  findByName(name: string): NoteColumn | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM note_columns WHERE name = ?')
      .get(name) as NoteColumnRow | undefined

    return row ? this.mapColumnRow(row) : undefined
  }

  getNextSortOrder(): number {
    const row = this.getDatabase()
      .prepare(
        'SELECT COALESCE(MAX(sort_order) + 1, 0) as sort_order FROM note_columns'
      )
      .get() as SortOrderRow | undefined

    return row?.sort_order ?? 0
  }

  create(column: Omit<NoteColumn, 'createdAt' | 'updatedAt'>): NoteColumn {
    this.getDatabase()
      .prepare(
        `
        INSERT INTO note_columns (
          id,
          name,
          title,
          type,
          sort_order,
          is_hidden,
          is_default,
          config_json
        ) VALUES (
          @id,
          @name,
          @title,
          @type,
          @sortOrder,
          @isHidden,
          @isDefault,
          @configJson
        )
      `
      )
      .run({
        id: column.id,
        name: column.name,
        title: column.title,
        type: column.type,
        sortOrder: column.sortOrder,
        isHidden: column.isHidden ? 1 : 0,
        isDefault: column.isDefault ? 1 : 0,
        configJson: column.config ? JSON.stringify(column.config) : null,
      })

    return this.findById(column.id) as NoteColumn
  }

  update(column: NoteColumn): NoteColumn {
    this.getDatabase()
      .prepare(
        `
        UPDATE note_columns
        SET name = @name,
            title = @title,
            type = @type,
            sort_order = @sortOrder,
            is_hidden = @isHidden,
            is_default = @isDefault,
            config_json = @configJson,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `
      )
      .run({
        id: column.id,
        name: column.name,
        title: column.title,
        type: column.type,
        sortOrder: column.sortOrder,
        isHidden: column.isHidden ? 1 : 0,
        isDefault: column.isDefault ? 1 : 0,
        configJson: column.config ? JSON.stringify(column.config) : null,
      })

    return this.findById(column.id) as NoteColumn
  }

  updateSortOrders(columnIds: string[]): void {
    const database = this.getDatabase()
    const updateSortOrder = database.prepare(
      'UPDATE note_columns SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    const applySortOrders = database.transaction((ids: string[]) => {
      ids.forEach((id, index) => updateSortOrder.run(index, id))
    })

    applySortOrders(columnIds)
  }

  delete(id: string, options: DeleteColumnOptions = {}): void {
    const database = this.getDatabase()
    const deleteColumn = database.prepare(
      'DELETE FROM note_columns WHERE id = ?'
    )
    const deleteNoteValues = database.prepare(
      'DELETE FROM note_values WHERE column_id = ?'
    )
    const deleteWithOptionalValues = database.transaction(
      (columnId: string) => {
        if (options.deleteNoteData) {
          deleteNoteValues.run(columnId)
        }

        deleteColumn.run(columnId)
      }
    )

    deleteWithOptionalValues(id)
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }

  private mapColumnRow(row: NoteColumnRow): NoteColumn {
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      type: row.type as ColumnTypeEnum,
      sortOrder: row.sort_order,
      isHidden: Boolean(row.is_hidden),
      isDefault: Boolean(row.is_default),
      config: row.config_json
        ? (JSON.parse(row.config_json) as Record<string, unknown>)
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
