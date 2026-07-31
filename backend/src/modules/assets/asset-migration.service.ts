import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import type { NoteImageValue, NoteValue } from '../notes/types/note-value'
import { createLocalMutationMetadata } from '../sync/utils/create-local-mutation-metadata.util'
import { enqueueNoteSyncMutation } from '../sync/utils/enqueue-note-sync-mutation.util'
import { AssetsService } from './assets.service'

interface LegacyValueRow {
  column_id: string
  note_id: string
  value_json: string
}

@Injectable()
export class AssetMigrationService implements OnModuleInit {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
    @Inject(AssetsService) private readonly assetsService: AssetsService
  ) {}

  onModuleInit(): void {
    this.migrateLegacyNoteImages()
  }

  migrateLegacyNoteImages(): void {
    const database = this.databaseService.getConnection()
    const rows = database
      .prepare(
        'SELECT note_values.note_id, note_values.column_id, note_values.value_json ' +
          'FROM note_values INNER JOIN notes ON notes.id = note_values.note_id ' +
          "WHERE notes.deleted_at IS NULL AND (value_json LIKE '%data:image/%' OR " +
          'value_json LIKE \'%"path"%\') ORDER BY note_values.note_id, note_values.column_id'
      )
      .all() as LegacyValueRow[]
    const migrateRow = database.transaction((row: LegacyValueRow) => {
      const value = JSON.parse(row.value_json) as NoteValue
      const managedValue = this.manageLegacyValue(value)
      const result = database
        .prepare(
          'UPDATE note_values SET value_json = ?, ' +
            'updated_at = CURRENT_TIMESTAMP ' +
            'WHERE note_id = ? AND column_id = ? AND value_json = ?'
        )
        .run(
          JSON.stringify(managedValue),
          row.note_id,
          row.column_id,
          row.value_json
        )

      if (result.changes > 0) {
        const mutation = createLocalMutationMetadata(database)

        const noteUpdate = database
          .prepare(
            `
            UPDATE notes
            SET mutation_id = @mutationId,
                modified_by_device_id = @modifiedByDeviceId,
                modified_at = @modifiedAt
            WHERE id = @id AND deleted_at IS NULL
          `
          )
          .run({ id: row.note_id, ...mutation })

        if (noteUpdate.changes > 0) {
          enqueueNoteSyncMutation(database, row.note_id, mutation)
        }
      }
    })

    for (const row of rows) {
      try {
        migrateRow(row)
      } catch {
        // Invalid legacy values remain untouched and recoverable.
      }
    }
  }

  private manageLegacyValue(value: NoteValue): NoteValue {
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === 'string')) {
        return value
      }

      return value.map((item) => this.assetsService.manageImageValue(item))
    }

    if (value && typeof value === 'object') {
      return this.assetsService.manageImageValue(value as NoteImageValue)
    }

    return value
  }
}
