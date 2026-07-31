import type { Database } from 'better-sqlite3'

export const saveSyncProviderCursor = (
  database: Database,
  workspaceId: string,
  provider: string,
  cursor: string,
  wasFullEnumeration: boolean
): void => {
  const now = new Date().toISOString()
  database
    .prepare(
      `
    INSERT INTO sync_provider_cursors (
      id, workspace_id, provider, cursor, cursor_generation, is_invalidated,
      invalidation_reason, last_full_enumeration_at, created_at, updated_at
    ) VALUES (
      lower(hex(randomblob(16))), @workspaceId, @provider, @cursor, 0, 0,
      NULL, @lastFullEnumerationAt, @now, @now
    ) ON CONFLICT(provider, workspace_id) DO UPDATE SET
      cursor = excluded.cursor,
      cursor_generation = sync_provider_cursors.cursor_generation + 1,
      is_invalidated = 0,
      invalidation_reason = NULL,
      last_full_enumeration_at = CASE
        WHEN @wasFullEnumeration = 1 THEN @now
        ELSE sync_provider_cursors.last_full_enumeration_at
      END,
      updated_at = @now
  `
    )
    .run({
      workspaceId,
      provider,
      cursor,
      wasFullEnumeration: wasFullEnumeration ? 1 : 0,
      lastFullEnumerationAt: wasFullEnumeration ? now : null,
      now,
    })
}
