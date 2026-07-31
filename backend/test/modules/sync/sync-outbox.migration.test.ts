import { describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { addSyncOutboxMigration } from '../../../src/modules/database/migrations/009-add-sync-outbox'

describe('sync outbox migration', () => {
  it('creates its durable schema and indexes idempotently', () => {
    const service = new DatabaseService({ filePath: ':memory:' })
    service.initialize()
    const database = service.getConnection()

    expect(() => addSyncOutboxMigration.up(database)).not.toThrow()
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'sync_outbox' ORDER BY name"
        )
        .all()
        .map((row) => (row as { name: string }).name)
    ).toEqual([
      'idx_sync_outbox_claimable',
      'idx_sync_outbox_latest_mutation',
      'idx_sync_outbox_pending_target',
      'idx_sync_outbox_target',
      'sqlite_autoindex_sync_outbox_1',
    ])
    service.close()
  })

  it('enforces hash, state, lease, and pending-target constraints', () => {
    const service = new DatabaseService({ filePath: ':memory:' })
    service.initialize()
    const database = service.getConnection()
    const identity = database
      .prepare('SELECT workspace_id, device_id FROM sync_identity WHERE id = 1')
      .get() as { workspace_id: string; device_id: string }
    const insert = database.prepare(`
      INSERT INTO sync_outbox (
        mutation_id, latest_mutation_id, workspace_id, entity_kind, entity_id,
        logical_key, intent, base_hash, target_hash, originating_device_id,
        status, claim_token, claimed_by, claim_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'note', 'note-id', 'notes/note-id.json', 'upsert',
        NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const timestamp = '2026-07-31T10:00:00.000Z'

    expect(() =>
      insert.run(
        'bad-hash',
        'bad-hash',
        identity.workspace_id,
        'short',
        identity.device_id,
        'pending',
        null,
        null,
        null,
        timestamp,
        timestamp
      )
    ).toThrow()
    expect(() =>
      insert.run(
        'bad-lease',
        'bad-lease',
        identity.workspace_id,
        'a'.repeat(64),
        identity.device_id,
        'claimed',
        null,
        null,
        null,
        timestamp,
        timestamp
      )
    ).toThrow()

    insert.run(
      'first',
      'first',
      identity.workspace_id,
      'a'.repeat(64),
      identity.device_id,
      'pending',
      null,
      null,
      null,
      timestamp,
      timestamp
    )
    expect(() =>
      insert.run(
        'duplicate-target',
        'duplicate-target',
        identity.workspace_id,
        'b'.repeat(64),
        identity.device_id,
        'pending',
        null,
        null,
        null,
        timestamp,
        timestamp
      )
    ).toThrow()
    service.close()
  })
})
