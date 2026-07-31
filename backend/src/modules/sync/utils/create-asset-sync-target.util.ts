import type { Database } from 'better-sqlite3'

export const createAssetSyncTarget = (
  database: Database,
  assetId: string
): unknown =>
  database
    .prepare(
      `SELECT
        asset_id AS assetId,
        mime_type AS mimeType,
        size,
        extension
      FROM assets WHERE asset_id = ?`
    )
    .get(assetId) ?? null
