import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { SyncRemoteDocumentRepository } from '../../../src/modules/sync/sync-remote-document.repository'
import { SyncEntityKindEnum } from '../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncProviderEnum } from '../../../src/modules/sync/types/sync-provider-enum'
import { mapSyncDocument } from '../../../src/modules/sync/utils/map-sync-document.util'

let databaseService: DatabaseService
let repository: SyncRemoteDocumentRepository

const deviceId = '22222222-2222-4222-8222-222222222222'
const mutationId = '33333333-3333-4333-8333-333333333333'
const noteId = '44444444-4444-4444-8444-444444444444'
const noteTypeId = '55555555-5555-4555-8555-555555555555'
const modifiedAt = '2026-07-31T12:00:00.000Z'

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  repository = new SyncRemoteDocumentRepository(databaseService)
})

afterEach(() => {
  databaseService.close()
})

describe('SyncRemoteDocumentRepository', () => {
  it('persists and replaces the authoritative hash and canonical merge base', () => {
    const workspace = databaseService
      .getConnection()
      .prepare('SELECT workspace_id FROM sync_identity WHERE id = 1')
      .get() as { workspace_id: string }
    const first = mapSyncDocument({
      formatVersion: 1,
      workspaceId: workspace.workspace_id,
      parentHash: null,
      mutationId,
      modifiedBy: deviceId,
      modifiedAt,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: { title: 'First' } },
    })
    const firstState = repository.saveReconciledDocument({
      provider: SyncProviderEnum.GoogleDrive,
      providerObjectId: 'provider-file-1',
      providerVersion: 'etag-1',
      mappedDocument: first,
    })
    const second = mapSyncDocument({
      formatVersion: 1,
      workspaceId: workspace.workspace_id,
      parentHash: first.contentHash,
      mutationId: '99999999-9999-4999-8999-999999999999',
      modifiedBy: deviceId,
      modifiedAt: '2026-07-31T13:00:00.000Z',
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: { title: 'Second' } },
    })
    const secondState = repository.saveReconciledDocument({
      provider: SyncProviderEnum.GoogleDrive,
      providerObjectId: 'provider-file-1',
      providerVersion: 'etag-2',
      mappedDocument: second,
    })

    expect(firstState).toMatchObject({
      entityKind: SyncEntityKindEnum.Note,
      entityId: noteId,
      contentHash: first.contentHash,
      mergeBaseJson: first.canonicalJson,
    })
    expect(secondState).toMatchObject({
      providerVersion: 'etag-2',
      contentHash: second.contentHash,
      mergeBaseJson: second.canonicalJson,
    })
    expect(JSON.parse(secondState.mergeBaseJson)).toMatchObject({
      parentHash: first.contentHash,
      mutationId: '99999999-9999-4999-8999-999999999999',
      modifiedBy: deviceId,
    })
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM sync_remote_objects')
        .get()
    ).toEqual({ count: 1 })
  })
})
