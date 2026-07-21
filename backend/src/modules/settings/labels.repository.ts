import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import type { Label } from './types/label'

interface LabelRow {
  id: string
  title: string
  name: string
  color: string
  note_type_id: string | null
  created_at: string
  updated_at: string
}

@Injectable()
export class LabelsRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findAll(): Label[] {
    return this.getDatabase()
      .prepare('SELECT * FROM labels ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => this.mapLabelRow(row as LabelRow))
  }

  findById(id: string): Label | undefined {
    const row = this.getDatabase()
      .prepare('SELECT * FROM labels WHERE id = ?')
      .get(id) as LabelRow | undefined

    return row ? this.mapLabelRow(row) : undefined
  }

  findBySourceAndName(
    noteTypeId: string | null,
    name: string
  ): Label | undefined {
    const row =
      noteTypeId === null
        ? (this.getDatabase()
            .prepare(
              'SELECT * FROM labels WHERE note_type_id IS NULL AND name = ?'
            )
            .get(name) as LabelRow | undefined)
        : (this.getDatabase()
            .prepare('SELECT * FROM labels WHERE note_type_id = ? AND name = ?')
            .get(noteTypeId, name) as LabelRow | undefined)

    return row ? this.mapLabelRow(row) : undefined
  }

  create(input: {
    title: string
    name: string
    color: string
    noteTypeId: string | null
  }): Label {
    const id = uuidV4()

    this.getDatabase()
      .prepare(
        `
        INSERT INTO labels (id, title, name, color, note_type_id)
        VALUES (@id, @title, @name, @color, @noteTypeId)
      `
      )
      .run({ id, ...input })

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
    this.getDatabase()
      .prepare(
        `
        UPDATE labels
        SET title = @title,
            name = @name,
            color = @color,
            note_type_id = @noteTypeId,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `
      )
      .run({ id, ...input })

    return this.findById(id)
  }

  deleteWithValueCleanup(id: string): boolean {
    return this.deleteWithValueCleanupAndCount(id).deleted
  }

  deleteWithValueCleanupAndCount(id: string): {
    deleted: boolean
    affectedNoteValuesCount: number
  } {
    const deleteLabel = this.getDatabase().transaction((labelId: string) => {
      const affectedNoteValuesCount = this.pruneLabelIdsFromNoteValues([
        labelId,
      ])
      const deleted =
        this.getDatabase()
          .prepare('DELETE FROM labels WHERE id = ?')
          .run(labelId).changes > 0

      return { deleted, affectedNoteValuesCount }
    })

    return deleteLabel(id)
  }

  deleteByNoteTypeIdWithValueCleanup(noteTypeId: string): number {
    const deleteLabels = this.getDatabase().transaction((sourceId: string) => {
      const labelIds = (
        this.getDatabase()
          .prepare(
            'SELECT id FROM labels WHERE note_type_id = ? ORDER BY id ASC'
          )
          .all(sourceId) as Array<{ id: string }>
      ).map((row) => row.id)

      this.pruneLabelIdsFromNoteValues(labelIds)

      return this.getDatabase()
        .prepare('DELETE FROM labels WHERE note_type_id = ?')
        .run(sourceId).changes
    })

    return deleteLabels(noteTypeId)
  }

  private pruneLabelIdsFromNoteValues(labelIds: string[]): number {
    if (labelIds.length === 0) {
      return 0
    }

    const labelIdSet = new Set(labelIds)
    const rows = this.getDatabase()
      .prepare(
        `
        SELECT note_values.note_id, note_values.column_id, note_values.value_json
        FROM note_values
        INNER JOIN note_columns ON note_columns.id = note_values.column_id
        WHERE note_columns.type = 'labels'
      `
      )
      .all() as Array<{
      note_id: string
      column_id: string
      value_json: string | null
    }>
    const updateValue = this.getDatabase().prepare(
      `
      UPDATE note_values
      SET value_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE note_id = ? AND column_id = ?
    `
    )

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

      updateValue.run(JSON.stringify(nextValue), row.note_id, row.column_id)
      affectedNoteValuesCount += 1
    }

    return affectedNoteValuesCount
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

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
