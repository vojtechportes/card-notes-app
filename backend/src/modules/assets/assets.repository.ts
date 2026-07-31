import { Inject, Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import type { AssetRecord } from './types/asset-record'

interface AssetRow {
  asset_id: string
  extension: string
  integrity_state: AssetRecord['integrityState']
  mime_type: string
  relative_path: string
  size: number
}

@Injectable()
export class AssetsRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findById(assetId: string): AssetRecord | undefined {
    const row = this.databaseService
      .getConnection()
      .prepare('SELECT * FROM assets WHERE asset_id = ?')
      .get(assetId) as AssetRow | undefined

    return row ? this.mapRow(row) : undefined
  }

  upsert(record: AssetRecord): void {
    this.databaseService
      .getConnection()
      .prepare(
        `INSERT INTO assets (
          asset_id, mime_type, size, extension, relative_path, integrity_state
        ) VALUES (
          @assetId, @mimeType, @size, @extension, @relativePath, @integrityState
        ) ON CONFLICT(asset_id) DO UPDATE SET
          mime_type = excluded.mime_type,
          size = excluded.size,
          extension = excluded.extension,
          relative_path = excluded.relative_path,
          integrity_state = 'available',
          updated_at = CURRENT_TIMESTAMP,
          last_verified_at = CURRENT_TIMESTAMP`
      )
      .run(record)
  }

  updateIntegrityState(
    assetId: string,
    integrityState: AssetRecord['integrityState']
  ): void {
    this.databaseService
      .getConnection()
      .prepare(
        `UPDATE assets
         SET integrity_state = ?, updated_at = CURRENT_TIMESTAMP,
             last_verified_at = CURRENT_TIMESTAMP
         WHERE asset_id = ?`
      )
      .run(integrityState, assetId)
  }

  private mapRow(row: AssetRow): AssetRecord {
    return {
      assetId: row.asset_id,
      extension: row.extension,
      integrityState: row.integrity_state,
      mimeType: row.mime_type,
      relativePath: row.relative_path,
      size: row.size,
    }
  }
}
