import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import type { NoteImageValue, NoteValue } from '../notes/types/note-value'
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
        'SELECT note_id, column_id, value_json FROM note_values ' +
          "WHERE value_json LIKE '%data:image/%' OR " +
          'value_json LIKE \'%"path"%\' ORDER BY note_id, column_id'
      )
      .all() as LegacyValueRow[]
    const migrateRow = database.transaction((row: LegacyValueRow) => {
      const value = JSON.parse(row.value_json) as NoteValue
      const managedValue = this.manageLegacyValue(value)

      database
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
