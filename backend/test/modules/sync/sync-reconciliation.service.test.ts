import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { v4 as uuidV4 } from 'uuid'
import { AssetsRepository } from '../../../src/modules/assets/assets.repository'
import { AssetsService } from '../../../src/modules/assets/assets.service'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { syncLogicalKeys } from '../../../src/modules/sync/constants/sync-logical-keys'
import { FakeSyncProviderAdapter } from '../../../src/modules/sync/fake-provider/fake-sync-provider.adapter'
import { SyncConflictRepository } from '../../../src/modules/sync/sync-conflict.repository'
import { SyncOutboxRepository } from '../../../src/modules/sync/sync-outbox.repository'
import { SyncReconciliationRepository } from '../../../src/modules/sync/sync-reconciliation.repository'
import { SyncReconciliationService } from '../../../src/modules/sync/sync-reconciliation.service'
import { SyncEntityKindEnum } from '../../../src/modules/sync/types/sync-entity-kind-enum'
import type { SyncConfigurationDocument } from '../../../src/modules/sync/types/sync-configuration-document'
import type { SyncReconciliationFaultInjector } from '../../../src/modules/sync/types/sync-reconciliation-fault-injector'
import { mapSyncDocument } from '../../../src/modules/sync/utils/map-sync-document.util'

const remoteDeviceId = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-07-31T12:00:00.000Z'

let databaseService: DatabaseService
let adapter: FakeSyncProviderAdapter
let outboxRepository: SyncOutboxRepository
let conflictRepository: SyncConflictRepository
let reconciliationRepository: SyncReconciliationRepository
let assetsService: AssetsService

const activateSynchronization = (): {
  workspaceId: string
  noteTypeId: string
} => {
  const database = databaseService.getConnection()
  const identity = database
    .prepare(
      'SELECT workspace_id AS workspaceId FROM sync_identity WHERE id = 1'
    )
    .get() as { workspaceId: string }
  const noteType = database
    .prepare('SELECT id FROM note_types ORDER BY created_at LIMIT 1')
    .get() as { id: string }
  database
    .prepare(
      `UPDATE sync_account_state SET is_enabled = 1,
      active_provider = 'google-drive', connection_state = 'connected',
      provider_workspace_id = ? WHERE id = 1`
    )
    .run(identity.workspaceId)
  return { workspaceId: identity.workspaceId, noteTypeId: noteType.id }
}

const createService = (
  faultInjector?: SyncReconciliationFaultInjector
): SyncReconciliationService =>
  new SyncReconciliationService(
    reconciliationRepository,
    outboxRepository,
    assetsService,
    faultInjector
  )

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  adapter = new FakeSyncProviderAdapter({ pageSize: 1 })
  outboxRepository = new SyncOutboxRepository(databaseService)
  conflictRepository = new SyncConflictRepository(databaseService)
  reconciliationRepository = new SyncReconciliationRepository(
    databaseService,
    conflictRepository
  )
  assetsService = {
    readAsset: () => {
      throw new Error('No local assets expected in this test.')
    },
    storeSynchronizedImage: () => {
      throw new Error('No remote assets expected in this test.')
    },
  } as unknown as AssetsService
})

afterEach(() => {
  databaseService.close()
})

describe('SyncReconciliationService', () => {
  it('enumerates and transactionally applies a remote note before committing the cursor', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )

    const result = await createService().run(adapter, { claimedBy: 'test' })

    expect(result.pulledCount).toBe(1)
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT id FROM notes WHERE id = ?')
        .get(noteId)
    ).toEqual({ id: noteId })
    expect(
      reconciliationRepository.getCursor(
        reconciliationRepository.getActiveContext()!
      )
    ).toMatchObject({ cursor: '1', isInvalidated: false })
  })

  it('rolls back domain state, remote metadata, and cursor together at the cursor boundary', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'before-cursor-commit') {
          throw new Error('simulated crash')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('simulated crash')
    const database = databaseService.getConnection()
    expect(
      database.prepare('SELECT id FROM notes WHERE id = ?').get(noteId)
    ).toBeUndefined()
    expect(database.prepare('SELECT * FROM sync_remote_objects').all()).toEqual(
      []
    )
    expect(
      database.prepare('SELECT * FROM sync_provider_cursors').all()
    ).toEqual([])
  })

  it('pushes local outbox work, verifies it, and completes the mutation', async () => {
    const { noteTypeId } = activateSynchronization()
    const note = new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )

    const result = await createService().run(adapter, { claimedBy: 'test' })

    expect(result.pushedCount).toBe(1)
    expect(adapter.getObject(syncLogicalKeys.note(note.id))).toBeDefined()
    expect(outboxRepository.findAll()).toEqual([
      expect.objectContaining({ status: 'completed', entityId: note.id }),
    ])
  })

  it('preserves a create/create collision without overwriting either note', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    new NotesRepository(databaseService).create(
      noteId,
      noteTypeId,
      {},
      timestamp
    )
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: 'CREAM', values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )

    await createService().run(adapter, { claimedBy: 'test' })

    const notes = databaseService
      .getConnection()
      .prepare('SELECT id, background FROM notes ORDER BY id')
      .all() as Array<{ id: string; background: string | null }>
    const conflicts = conflictRepository.listUnresolved(workspaceId)

    expect(notes).toHaveLength(2)
    expect(notes.some((note) => note.background === null)).toBe(true)
    expect(notes.some((note) => note.background === 'CREAM')).toBe(true)
    expect(conflicts).toEqual([
      expect.objectContaining({
        conflictCopyEntityId: expect.any(String),
        conflictType: 'uuid-collision',
        entityId: noteId,
      }),
    ])
  })
  it('falls back to enumeration when an incremental cursor expires', async () => {
    const context = activateSynchronization()
    await createService().run(adapter, { claimedBy: 'test' })
    adapter.invalidateCursorsBefore(1)
    reconciliationRepository.invalidateCursor(
      reconciliationRepository.getActiveContext()!,
      'test-expiration'
    )

    await createService().run(adapter, { claimedBy: 'test' })
    expect(
      reconciliationRepository.getCursor(
        reconciliationRepository.getActiveContext()!
      )
    ).toMatchObject({ isInvalidated: false })
    expect(context.workspaceId).toBeTruthy()
  })

  it('recovers idempotently after a remote write succeeds before local acknowledgement', async () => {
    const { noteTypeId } = activateSynchronization()
    const note = new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )
    let shouldCrash = true
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'after-remote-write' && shouldCrash) {
          shouldCrash = false
          throw new Error('simulated ambiguous write result')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('simulated ambiguous write result')
    expect(adapter.getObject(syncLogicalKeys.note(note.id))).toBeDefined()
    expect(outboxRepository.findAll()[0]).toMatchObject({ status: 'pending' })

    await createService().run(adapter, { claimedBy: 'restart' })
    expect(outboxRepository.findAll()[0]).toMatchObject({ status: 'completed' })
    expect(
      adapter.getObject(syncLogicalKeys.note(note.id))?.providerVersion
    ).toBe('1')
  })

  it('retains retryable failures with their normalized classification', async () => {
    const { noteTypeId } = activateSynchronization()
    new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )
    adapter.queueFailure(
      'create-document',
      new (
        await import('../../../src/modules/sync/types/sync-provider-error')
      ).SyncProviderError(
        (
          await import('../../../src/modules/sync/types/sync-provider-error-kind-enum')
        ).SyncProviderErrorKindEnum.Throttled,
        'retry later',
        20_000
      )
    )

    await expect(
      createService().run(adapter, { claimedBy: 'test' })
    ).rejects.toMatchObject({ kind: 'throttled' })
    expect(outboxRepository.findAll()[0]).toMatchObject({
      status: 'pending',
      lastFailureClassification: 'throttled',
    })
    expect(outboxRepository.findAll()[0].nextAttemptAt).not.toBeNull()
  })
  it('applies incremental configuration changes after establishing the merge base', async () => {
    activateSynchronization()
    const context = reconciliationRepository.getActiveContext()!
    const local = reconciliationRepository.createLocalDocument(
      context,
      SyncEntityKindEnum.Configuration,
      'configuration',
      null
    )!
    adapter.seedDocument(
      local.logicalKey,
      SyncEntityKindEnum.Configuration,
      local.canonicalJson
    )
    await createService().run(adapter, { claimedBy: 'test' })

    const document = local.document as SyncConfigurationDocument
    const changed = mapSyncDocument({
      ...document,
      parentHash: local.contentHash,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: '2026-07-31T13:00:00.000Z',
      payload: {
        ...document.payload,
        noteTypes: document.payload.noteTypes.map((entity, index) =>
          index === 0 && entity.payload
            ? {
                ...entity,
                mutationId: uuidV4(),
                modifiedBy: remoteDeviceId,
                modifiedAt: '2026-07-31T13:00:00.000Z',
                payload: { ...entity.payload, title: 'Remote title' },
              }
            : entity
        ),
      },
    })
    const current = adapter.getObject(local.logicalKey)!
    await adapter.updateDocument(
      local.logicalKey,
      SyncEntityKindEnum.Configuration,
      changed.canonicalJson,
      current.providerVersion
    )

    await createService().run(adapter, { claimedBy: 'test' })
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT title FROM note_types ORDER BY created_at LIMIT 1')
        .get()
    ).toEqual({ title: 'Remote title' })
  })

  it('applies a remote tombstone without resurrecting the note', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const first = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      first.logicalKey,
      SyncEntityKindEnum.Note,
      first.canonicalJson
    )
    await createService().run(adapter, { claimedBy: 'test' })

    const tombstone = mapSyncDocument({
      ...first.document,
      parentHash: first.contentHash,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: '2026-07-31T13:00:00.000Z',
      deletedAt: '2026-07-31T13:00:00.000Z',
      payload: null,
    })
    await adapter.updateDocument(
      tombstone.logicalKey,
      SyncEntityKindEnum.Note,
      tombstone.canonicalJson,
      adapter.getObject(first.logicalKey)!.providerVersion
    )

    await createService().run(adapter, { claimedBy: 'test' })
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT deleted_at FROM notes WHERE id = ?')
        .get(noteId)
    ).toEqual({ deleted_at: '2026-07-31T13:00:00.000Z' })
  })

  it('coalesces concurrent run triggers into one serialized follow-up run', async () => {
    activateSynchronization()
    const originalEnumerate = adapter.enumerateObjects.bind(adapter)
    let releaseEnumeration: (() => void) | undefined
    let enumerationStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      enumerationStarted = resolve
    })
    const gate = new Promise<void>((resolve) => {
      releaseEnumeration = resolve
    })
    adapter.enumerateObjects = async (pageToken?: string) => {
      enumerationStarted?.()
      await gate
      return originalEnumerate(pageToken)
    }
    const service = createService()
    const first = service.run(adapter, { claimedBy: 'first' })
    await started
    const second = service.run(adapter, { claimedBy: 'second' })

    expect(second).toBe(first)
    releaseEnumeration?.()
    await expect(first).resolves.toMatchObject({ followUpRun: true })
  })
  it('downloads and verifies immutable assets before committing their remote state', async () => {
    activateSynchronization()
    const dataRoot = mkdtempSync(join(tmpdir(), 'notestack-sync-assets-'))
    process.env.CARD_NOTES_DATA_ROOT = dataRoot
    try {
      const realAssetsService = new AssetsService(
        new AssetsRepository(databaseService)
      )
      const bytes = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP2S8QAAAABJRU5ErkJggg==',
        'base64'
      )
      const assetId = createHash('sha256').update(bytes).digest('hex')
      const logicalKey = `assets/${assetId}.png`
      await adapter.createAsset(logicalKey, bytes, assetId)

      await new SyncReconciliationService(
        reconciliationRepository,
        outboxRepository,
        realAssetsService
      ).run(adapter, { claimedBy: 'test' })

      expect(realAssetsService.readAsset(assetId).buffer).toEqual(bytes)
      expect(
        reconciliationRepository.findRemoteState(
          reconciliationRepository.getActiveContext()!,
          logicalKey
        )
      ).toMatchObject({ contentHash: assetId, entityKind: 'asset' })
    } finally {
      delete process.env.CARD_NOTES_DATA_ROOT
      rmSync(dataRoot, { force: true, recursive: true })
    }
  })
  it('leaves state untouched when interrupted before local application', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'before-local-apply') {
          throw new Error('crash before local apply')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('crash before local apply')
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT * FROM sync_provider_cursors')
        .all()
    ).toEqual([])
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT id FROM notes WHERE id = ?')
        .get(noteId)
    ).toBeUndefined()
  })

  it('recovers a verified write interrupted before outbox completion without rewriting it', async () => {
    const { noteTypeId } = activateSynchronization()
    const note = new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )
    let shouldCrash = true
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'before-outbox-complete' && shouldCrash) {
          shouldCrash = false
          throw new Error('crash before completion')
        }
      },
    }
    await expect(
      createService(faultInjector).run(adapter, {
        claimedBy: 'test',
        leaseDurationMs: 1,
      })
    ).rejects.toThrow('crash before completion')
    expect(outboxRepository.findAll()[0]).toMatchObject({ status: 'claimed' })

    await createService().run(adapter, {
      claimedBy: 'restart',
      now: new Date(Date.now() + 1_000),
    })
    expect(outboxRepository.findAll()[0]).toMatchObject({ status: 'completed' })
    expect(
      adapter.getObject(syncLogicalKeys.note(note.id))?.providerVersion
    ).toBe('1')
  })

  it('conditionally updates an established remote document and verifies its new lineage', async () => {
    const { noteTypeId } = activateSynchronization()
    const repository = new NotesRepository(databaseService)
    const note = repository.create(uuidV4(), noteTypeId, {}, timestamp)
    await createService().run(adapter, { claimedBy: 'seed' })

    repository.updateBackground(note.id, 'CREAM', '2026-07-31T13:00:00.000Z')
    await createService().run(adapter, { claimedBy: 'update' })

    expect(
      adapter.getObject(syncLogicalKeys.note(note.id))?.providerVersion
    ).toBe('2')
    expect(outboxRepository.findAll().at(-1)).toMatchObject({
      status: 'completed',
    })
    expect(
      JSON.parse(
        adapter.getObject(syncLogicalKeys.note(note.id))!.bytes.toString('utf8')
      )
    ).toMatchObject({
      parentHash: expect.any(String),
      payload: { background: 'CREAM' },
    })
  })

  it('re-pulls and retries a conditional update after a provider version race', async () => {
    const { noteTypeId } = activateSynchronization()
    const repository = new NotesRepository(databaseService)
    const note = repository.create(uuidV4(), noteTypeId, {}, timestamp)
    await createService().run(adapter, { claimedBy: 'seed' })
    repository.updateBackground(note.id, 'LEMON', '2026-07-31T13:00:00.000Z')

    const originalUpdate = adapter.updateDocument.bind(adapter)
    let injectRace = true
    adapter.updateDocument = async (
      logicalKey,
      entityKind,
      canonicalJson,
      expectedVersion
    ) => {
      if (injectRace) {
        injectRace = false
        const current = adapter.getObject(logicalKey)!
        await originalUpdate(
          logicalKey,
          entityKind,
          current.bytes.toString('utf8'),
          current.providerVersion
        )
      }
      return originalUpdate(
        logicalKey,
        entityKind,
        canonicalJson,
        expectedVersion
      )
    }

    await createService().run(adapter, { claimedBy: 'race' })

    expect(
      adapter.getObject(syncLogicalKeys.note(note.id))?.providerVersion
    ).toBe('3')
    expect(outboxRepository.findAll().at(-1)).toMatchObject({
      status: 'completed',
    })
  })

  it('conditionally repairs a corrupt known remote document without conflict churn', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )
    await createService().run(adapter, { claimedBy: 'initial' })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      JSON.stringify({ ...remote.document, contentHash: '0'.repeat(64) })
    )

    let shouldInterrupt = true
    const interruptedService = createService({
      reach: (boundary) => {
        if (shouldInterrupt && boundary === 'before-local-apply') {
          shouldInterrupt = false
          throw new Error('interrupt-corrupt-repair')
        }
      },
    })

    await expect(
      interruptedService.run(adapter, { claimedBy: 'interrupt-repair' })
    ).rejects.toThrow('interrupt-corrupt-repair')
    const pendingRepair = outboxRepository.findAll().at(-1)!
    expect(conflictRepository.listUnresolved(workspaceId)).toHaveLength(1)

    const repaired = await createService().run(adapter, {
      claimedBy: 'repair-corrupt',
    })
    const conflictsAfterRepair = conflictRepository.listUnresolved(workspaceId)

    expect(repaired.pushedCount).toBe(1)
    expect(outboxRepository.findAll().at(-1)?.mutationId).toBe(
      pendingRepair.mutationId
    )
    expect(conflictsAfterRepair).toEqual([
      expect.objectContaining({
        conflictType: 'remote-corruption',
        entityId: noteId,
      }),
    ])
    await createService().run(adapter, { claimedBy: 'verify-repair' })
    expect(conflictRepository.listUnresolved(workspaceId)).toHaveLength(1)
    expect(outboxRepository.findAll().at(-1)).toMatchObject({
      entityId: noteId,
      status: 'completed',
    })
  })
  it('does not overwrite a remote document from a newer format version', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )
    await createService().run(adapter, { claimedBy: 'initial' })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      JSON.stringify({ ...remote.document, formatVersion: 99 })
    )

    await expect(
      createService().run(adapter, { claimedBy: 'newer-format' })
    ).rejects.toThrow(/requires a newer application version/)
    expect(conflictRepository.listUnresolved(workspaceId)).toEqual([])
    expect(outboxRepository.findAll()).toEqual([])
  })
  it('treats a known object missing from a full enumeration as a repair condition', async () => {
    const { noteTypeId } = activateSynchronization()
    const note = new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )
    await createService().run(adapter, { claimedBy: 'seed' })
    adapter.deleteObject(syncLogicalKeys.note(note.id))
    const context = reconciliationRepository.getActiveContext()!
    reconciliationRepository.invalidateCursor(context, 'expired')

    await expect(
      createService().run(adapter, { claimedBy: 'rescan' })
    ).rejects.toBeInstanceOf(
      (
        await import('../../../src/modules/sync/types/sync-remote-deletion-error')
      ).SyncRemoteDeletionError
    )
    expect(reconciliationRepository.getCursor(context)).toMatchObject({
      isInvalidated: true,
    })
    expect(
      reconciliationRepository.findRemoteState(
        context,
        syncLogicalKeys.note(note.id)
      )
    ).toBeNull()
    expect(conflictRepository.listUnresolved(context.workspaceId)).toEqual([
      expect.objectContaining({
        conflictType: 'remote-corruption',
        entityId: note.id,
        fieldPaths: ['$remote.missing'],
      }),
    ])
    expect(outboxRepository.findAll().at(-1)).toMatchObject({
      entityId: note.id,
      status: 'pending',
    })

    await createService().run(adapter, { claimedBy: 'repair' })

    expect(adapter.getObject(syncLogicalKeys.note(note.id))).toBeDefined()
    expect(
      reconciliationRepository.findRemoteState(
        context,
        syncLogicalKeys.note(note.id)
      )
    ).not.toBeNull()
    expect(outboxRepository.findAll().at(-1)).toMatchObject({
      entityId: note.id,
      status: 'completed',
    })
  })

  it('does not contact the provider when interrupted before a remote write', async () => {
    const { noteTypeId } = activateSynchronization()
    const note = new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'before-remote-write') {
          throw new Error('crash before remote write')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('crash before remote write')
    expect(adapter.getObject(syncLogicalKeys.note(note.id))).toBeUndefined()
    expect(outboxRepository.findAll()[0]).toMatchObject({
      status: 'pending',
      lastFailureClassification: 'transient',
    })
  })

  it('rolls back local application when interrupted immediately after applying it', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'after-local-apply') {
          throw new Error('crash after local apply')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('crash after local apply')
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT id FROM notes WHERE id = ?')
        .get(noteId)
    ).toBeUndefined()
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT * FROM sync_provider_cursors')
        .all()
    ).toEqual([])
  })

  it('repeats safely after interruption immediately after the cursor commit', async () => {
    const { workspaceId, noteTypeId } = activateSynchronization()
    const noteId = uuidV4()
    const remote = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      parentHash: null,
      mutationId: uuidV4(),
      modifiedBy: remoteDeviceId,
      modifiedAt: timestamp,
      entityType: 'note',
      entityId: noteId,
      deletedAt: null,
      payload: { noteTypeId, background: null, values: {} },
    })
    adapter.seedDocument(
      remote.logicalKey,
      SyncEntityKindEnum.Note,
      remote.canonicalJson
    )
    let shouldCrash = true
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'after-cursor-commit' && shouldCrash) {
          shouldCrash = false
          throw new Error('crash after cursor commit')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('crash after cursor commit')
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT id FROM notes WHERE id = ?')
        .get(noteId)
    ).toEqual({ id: noteId })
    await createService().run(adapter, { claimedBy: 'restart' })
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM notes WHERE id = ?')
        .get(noteId)
    ).toEqual({ count: 1 })
  })

  it('repeats safely after interruption immediately after outbox completion', async () => {
    const { noteTypeId } = activateSynchronization()
    const note = new NotesRepository(databaseService).create(
      uuidV4(),
      noteTypeId,
      {},
      timestamp
    )
    let shouldCrash = true
    const faultInjector: SyncReconciliationFaultInjector = {
      reach: (boundary) => {
        if (boundary === 'after-outbox-complete' && shouldCrash) {
          shouldCrash = false
          throw new Error('crash after outbox completion')
        }
      },
    }

    await expect(
      createService(faultInjector).run(adapter, { claimedBy: 'test' })
    ).rejects.toThrow('crash after outbox completion')
    expect(outboxRepository.findAll()[0]).toMatchObject({ status: 'completed' })
    await createService().run(adapter, { claimedBy: 'restart' })
    expect(
      adapter.getObject(syncLogicalKeys.note(note.id))?.providerVersion
    ).toBe('1')
  })
})
