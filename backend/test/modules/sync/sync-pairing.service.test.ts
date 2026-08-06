import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { v4 as uuidV4 } from 'uuid'
import type { AssetsService } from '../../../src/modules/assets/assets.service'
import { DatabaseService } from '../../../src/modules/database/database.service'
import type { RuntimeDiagnosticsService } from '../../../src/modules/runtime-diagnostics/runtime-diagnostics.service'
import { FakeSyncProviderAdapter } from '../../../src/modules/sync/fake-provider/fake-sync-provider.adapter'
import { SyncConflictRepository } from '../../../src/modules/sync/sync-conflict.repository'
import { SyncOrchestrationRepository } from '../../../src/modules/sync/sync-orchestration.repository'
import { SyncOutboxRepository } from '../../../src/modules/sync/sync-outbox.repository'
import { SyncPairingRepository } from '../../../src/modules/sync/sync-pairing.repository'
import { SyncPairingService } from '../../../src/modules/sync/sync-pairing.service'
import { SyncReconciliationRepository } from '../../../src/modules/sync/sync-reconciliation.repository'
import { SyncReconciliationService } from '../../../src/modules/sync/sync-reconciliation.service'
import { SyncEntityKindEnum } from '../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from '../../../src/modules/sync/types/sync-mutation-intent-enum'
import { SyncPairingDecisionEnum } from '../../../src/modules/sync/types/sync-pairing-decision-enum'
import { SyncPairingModeEnum } from '../../../src/modules/sync/types/sync-pairing-mode-enum'
import { SyncProviderEnum } from '../../../src/modules/sync/types/sync-provider-enum'
import { SyncProviderError } from '../../../src/modules/sync/types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../../src/modules/sync/types/sync-provider-error-kind-enum'
import type { SyncProviderFactoryContract } from '../../../src/modules/sync/types/sync-provider-factory-contract'
import { createLocalConfigurationSyncDocument } from '../../../src/modules/sync/utils/create-local-configuration-sync-document.util'
import { createWorkspaceSyncDocument } from '../../../src/modules/sync/utils/create-workspace-sync-document.util'
import { enqueueSyncOutboxMutation } from '../../../src/modules/sync/utils/enqueue-sync-outbox-mutation.util'

const directories: string[] = []
const remoteDeviceId = '22222222-2222-4222-8222-222222222222'

let databaseService: DatabaseService
let googleAdapter: FakeSyncProviderAdapter
let oneDriveAdapter: FakeSyncProviderAdapter
let repository: SyncPairingRepository
let orchestrationRepository: SyncOrchestrationRepository
let service: SyncPairingService
let reconciliationService: SyncReconciliationService
let recordPairingFailure: ReturnType<typeof vi.fn>

const getWorkspaceId = (): string =>
  repository.getWorkspaceIdentity().workspaceId

const populateLocal = (): string => {
  const database = databaseService.getConnection()
  const noteType = database
    .prepare('SELECT id FROM note_types ORDER BY created_at LIMIT 1')
    .get() as { id: string }
  const mutationId = uuidV4()
  const now = new Date().toISOString()

  const noteId = uuidV4()
  database
    .prepare(
      `INSERT INTO notes (
      id, note_type_id, created_at, updated_at, mutation_id,
      modified_by_device_id, modified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      noteId,
      noteType.id,
      now,
      now,
      mutationId,
      repository.getWorkspaceIdentity().deviceId,
      now
    )

  return noteId
}

const seedRemote = (
  adapter: FakeSyncProviderAdapter,
  workspaceId: string
): void => {
  adapter.seedWorkspace(workspaceId)
  const workspace = createWorkspaceSyncDocument(workspaceId, remoteDeviceId)
  adapter.seedDocument(
    workspace.logicalKey,
    SyncEntityKindEnum.Workspace,
    workspace.canonicalJson
  )
  const configuration = createLocalConfigurationSyncDocument(
    databaseService.getConnection(),
    workspaceId,
    null
  )
  if (!configuration) {
    throw new Error('Expected the local default configuration to be mappable.')
  }
  adapter.seedDocument(
    configuration.logicalKey,
    SyncEntityKindEnum.Configuration,
    configuration.canonicalJson
  )
}

const bindOldProvider = (): void => {
  const workspaceId = getWorkspaceId()
  googleAdapter.seedWorkspace(workspaceId)
  databaseService
    .getConnection()
    .prepare(
      `UPDATE sync_account_state SET is_enabled = 1,
      active_provider = 'google-drive', connection_state = 'connected',
      provider_account_id = 'fake-account', provider_workspace_id = ?
      WHERE id = 1`
    )
    .run(workspaceId)
}

beforeEach(() => {
  const directory = mkdtempSync(join(tmpdir(), 'notestack-pairing-'))
  directories.push(directory)
  databaseService = new DatabaseService({
    filePath: join(directory, 'notestack.sqlite'),
  })
  databaseService.initialize()
  googleAdapter = new FakeSyncProviderAdapter()
  oneDriveAdapter = new FakeSyncProviderAdapter()
  repository = new SyncPairingRepository(databaseService)
  orchestrationRepository = new SyncOrchestrationRepository(databaseService)
  const conflictRepository = new SyncConflictRepository(databaseService)
  const reconciliationRepository = new SyncReconciliationRepository(
    databaseService,
    conflictRepository
  )
  const outboxRepository = new SyncOutboxRepository(databaseService)
  const assetsService = {
    readAsset: vi.fn(() => {
      throw new Error('No assets expected in pairing tests.')
    }),
    storeSynchronizedImage: vi.fn(() => {
      throw new Error('No assets expected in pairing tests.')
    }),
  } as unknown as AssetsService
  reconciliationService = new SyncReconciliationService(
    reconciliationRepository,
    outboxRepository,
    assetsService
  )
  const factory: SyncProviderFactoryContract = {
    create: (provider) =>
      provider === SyncProviderEnum.GoogleDrive
        ? googleAdapter
        : oneDriveAdapter,
  }

  recordPairingFailure = vi.fn()

  service = new SyncPairingService(
    databaseService,
    repository,
    orchestrationRepository,
    reconciliationService,
    factory as never,
    {
      recordPairingFailure,
    } as unknown as RuntimeDiagnosticsService
  )
})

afterEach(() => {
  databaseService.close()
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe(SyncPairingService.name, () => {
  it('classifies an empty provider as seed and creates a verified baseline', async () => {
    populateLocal()

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    expect(prepared).toMatchObject({
      mode: SyncPairingModeEnum.Seed,
      localIsPopulated: true,
      remoteIsPopulated: false,
    })

    const completed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })

    expect(completed).toMatchObject({
      status: 'completed',
      backupPath: expect.stringContaining('before-sync-pairing'),
    })
    expect(orchestrationRepository.getAccountState()).toMatchObject({
      activeProvider: SyncProviderEnum.GoogleDrive,
      providerWorkspaceId: getWorkspaceId(),
      providerAccountId: 'fake-account',
    })
    expect(googleAdapter.getObject('workspace.json')).toBeDefined()
    expect(googleAdapter.getObject('config.json')).toBeDefined()
    expect(orchestrationRepository.countPendingMutations()).toBe(0)
  })

  it('classifies and restores a populated remote workspace into empty local state', async () => {
    const remoteWorkspaceId = uuidV4()
    seedRemote(googleAdapter, remoteWorkspaceId)

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    expect(prepared.mode).toBe(SyncPairingModeEnum.Restore)
    const completed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Restore,
    })

    expect(completed.status).toBe('completed')
    expect(getWorkspaceId()).toBe(remoteWorkspaceId)
    expect(orchestrationRepository.getAccountState()).toMatchObject({
      activeProvider: SyncProviderEnum.GoogleDrive,
      providerWorkspaceId: remoteWorkspaceId,
    })
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM note_types')
        .get()
    ).toEqual({ count: 1 })
  })

  it('uses normal reconciliation for the same populated workspace', async () => {
    populateLocal()
    seedRemote(googleAdapter, getWorkspaceId())

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    expect(prepared.mode).toBe(SyncPairingModeEnum.Reconcile)
    await expect(
      service.confirm(prepared.id, {
        decision: SyncPairingDecisionEnum.Reconcile,
      })
    ).resolves.toMatchObject({ status: 'completed' })
  })

  it('requires an explicit mismatch decision and cancellation changes no binding', async () => {
    populateLocal()
    seedRemote(googleAdapter, uuidV4())

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    expect(prepared.mode).toBe(SyncPairingModeEnum.Mismatch)
    await expect(
      service.confirm(prepared.id, {
        decision: SyncPairingDecisionEnum.Seed,
      })
    ).rejects.toThrow('not valid for pairing mode mismatch')
    await expect(service.cancel(prepared.id)).resolves.toMatchObject({
      status: 'cancelled',
    })
    expect(orchestrationRepository.getAccountState()).toMatchObject({
      isEnabled: false,
      activeProvider: null,
    })
  })

  it('blocks switching with pending work unless it is explicitly retained', async () => {
    bindOldProvider()
    populateLocal()
    repository.createResolvedBaseline(
      SyncProviderEnum.GoogleDrive,
      getWorkspaceId(),
      false
    )

    await expect(
      service.prepare({ provider: SyncProviderEnum.OneDrive })
    ).rejects.toThrow('must be settled or explicitly retained')

    await expect(
      service.prepare({
        provider: SyncProviderEnum.OneDrive,
        retainPendingWork: true,
      })
    ).resolves.toMatchObject({
      operationType: 'switch',
      retainPendingWork: true,
      pendingMutationCount: expect.any(Number),
    })
  })

  it('activates a new provider only after retained work is reconciled', async () => {
    bindOldProvider()
    populateLocal()
    repository.createResolvedBaseline(
      SyncProviderEnum.GoogleDrive,
      getWorkspaceId(),
      false
    )
    const prepared = await service.prepare({
      provider: SyncProviderEnum.OneDrive,
      retainPendingWork: true,
    })

    const completed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })

    expect(completed.status).toBe('completed')
    expect(orchestrationRepository.getAccountState()).toMatchObject({
      activeProvider: SyncProviderEnum.OneDrive,
      providerWorkspaceId: getWorkspaceId(),
    })
    await expect(googleAdapter.listWorkspaces()).resolves.toHaveLength(1)
    expect(oneDriveAdapter.getObject('config.json')).toBeDefined()
    expect(orchestrationRepository.countPendingMutations()).toBe(0)
  })

  it('merges both populated workspaces into the selected remote workspace', async () => {
    const localNoteId = populateLocal()
    const remoteWorkspaceId = uuidV4()
    seedRemote(googleAdapter, remoteWorkspaceId)

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
      workspaceId: remoteWorkspaceId,
    })
    const completed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Merge,
    })

    expect(completed.status).toBe('completed')
    expect(getWorkspaceId()).toBe(remoteWorkspaceId)
    expect(googleAdapter.getObject(`notes/${localNoteId}.json`)).toBeDefined()
  })

  it('replaces local synchronized data from the selected remote workspace', async () => {
    populateLocal()
    const remoteWorkspaceId = uuidV4()
    seedRemote(googleAdapter, remoteWorkspaceId)

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
      workspaceId: remoteWorkspaceId,
    })
    const completed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.ReplaceLocal,
    })

    expect(completed.status).toBe('completed')
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM notes')
        .get()
    ).toEqual({ count: 0 })
    expect(getWorkspaceId()).toBe(remoteWorkspaceId)
  })

  it('replaces remote state in a new workspace without deleting the old cloud workspace', async () => {
    const localWorkspaceId = getWorkspaceId()
    const localNoteId = populateLocal()
    const remoteWorkspaceId = uuidV4()
    seedRemote(googleAdapter, remoteWorkspaceId)

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
      workspaceId: remoteWorkspaceId,
    })
    const completed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.ReplaceRemote,
    })

    expect(completed.status).toBe('completed')
    expect(getWorkspaceId()).toBe(localWorkspaceId)
    await expect(googleAdapter.listWorkspaces()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerWorkspaceId: remoteWorkspaceId }),
        expect.objectContaining({ providerWorkspaceId: localWorkspaceId }),
      ])
    )
    await googleAdapter.discoverWorkspace(remoteWorkspaceId)
    expect(googleAdapter.getObject('config.json')).toBeDefined()
    await googleAdapter.discoverWorkspace(localWorkspaceId)
    expect(googleAdapter.getObject(`notes/${localNoteId}.json`)).toBeDefined()
  })

  it('requires and honors explicit workspace selection when several are discovered', async () => {
    populateLocal()
    const firstWorkspaceId = uuidV4()
    const secondWorkspaceId = uuidV4()
    seedRemote(googleAdapter, firstWorkspaceId)
    seedRemote(googleAdapter, secondWorkspaceId)

    await expect(
      service.prepare({ provider: SyncProviderEnum.GoogleDrive })
    ).rejects.toThrow('select one explicitly')
    await expect(
      service.prepare({
        provider: SyncProviderEnum.GoogleDrive,
        workspaceId: firstWorkspaceId,
      })
    ).resolves.toMatchObject({ remoteWorkspaceId: firstWorkspaceId })
  })

  it('rejects an account change between prepare and confirm', async () => {
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })
    googleAdapter.getIdentity = async () => ({
      providerName: 'fake',
      accountId: 'changed-account',
      accountDisplayName: 'Changed account',
      adapterVersion: '1',
    })

    await expect(
      service.confirm(prepared.id, {
        decision: SyncPairingDecisionEnum.Seed,
      })
    ).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'account-mismatch',
    })
    expect(orchestrationRepository.getAccountState().activeProvider).toBeNull()
  })
  it('keeps rollback inside the exclusive boundary before queued synchronization', async () => {
    bindOldProvider()
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.OneDrive,
      retainPendingWork: true,
    })
    oneDriveAdapter.queueFailure(
      'enumerate',
      new SyncProviderError(
        SyncProviderErrorKindEnum.Transient,
        'fail before queued synchronization'
      )
    )
    const order: string[] = []
    const originalRestore =
      databaseService.restoreVerifiedBackup.bind(databaseService)
    vi.spyOn(databaseService, 'restoreVerifiedBackup').mockImplementation(
      (backupPath) => {
        order.push('restore-start')
        originalRestore(backupPath)
        order.push('restore-end')
      }
    )
    const originalEnumerate = googleAdapter.enumerateObjects.bind(googleAdapter)
    googleAdapter.enumerateObjects = async (pageToken?: string) => {
      order.push('queued-sync-start')
      return originalEnumerate(pageToken)
    }

    const confirmation = service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })
    const queuedSynchronization = reconciliationService.run(googleAdapter, {
      claimedBy: 'queued-after-failure',
    })

    await expect(confirmation).resolves.toMatchObject({ status: 'failed' })
    await queuedSynchronization
    expect(order).toEqual(['restore-start', 'restore-end', 'queued-sync-start'])
  })

  it('claims a prepared operation once across concurrent confirmations', async () => {
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    const first = service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })
    const second = service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })

    await expect(first).resolves.toMatchObject({ status: 'completed' })
    await expect(second).rejects.toThrow(
      'Only a prepared pairing can be confirmed'
    )
  })

  it('serializes cancellation against confirmation of the same operation', async () => {
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    const cancellation = service.cancel(prepared.id)
    const confirmation = service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })

    await expect(cancellation).resolves.toMatchObject({ status: 'cancelled' })
    await expect(confirmation).rejects.toThrow(
      'Only a prepared pairing can be confirmed'
    )
    expect(orchestrationRepository.getAccountState().activeProvider).toBeNull()
  })

  it('waits for active synchronization before taking the rollback backup', async () => {
    bindOldProvider()
    populateLocal()
    repository.createResolvedBaseline(
      SyncProviderEnum.GoogleDrive,
      getWorkspaceId(),
      false
    )
    const originalEnumerate = googleAdapter.enumerateObjects.bind(googleAdapter)
    let releaseEnumeration: (() => void) | undefined
    let enumerationStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      enumerationStarted = resolve
    })
    const gate = new Promise<void>((resolve) => {
      releaseEnumeration = resolve
    })
    googleAdapter.enumerateObjects = async (pageToken?: string) => {
      enumerationStarted?.()
      await gate
      return originalEnumerate(pageToken)
    }
    const active = reconciliationService.run(googleAdapter, {
      claimedBy: 'old-provider',
    })
    await started
    const prepared = await service.prepare({
      provider: SyncProviderEnum.OneDrive,
      retainPendingWork: true,
    })
    oneDriveAdapter.queueFailure(
      'enumerate',
      new SyncProviderError(
        SyncProviderErrorKindEnum.Transient,
        'fail after exclusive backup'
      )
    )
    const originalBackup =
      databaseService.createVerifiedBackup.bind(databaseService)
    const pendingCountsAtBackup: number[] = []
    vi.spyOn(databaseService, 'createVerifiedBackup').mockImplementation(
      (name) => {
        pendingCountsAtBackup.push(
          orchestrationRepository.countPendingMutations()
        )
        return originalBackup(name)
      }
    )

    const confirmation = service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })
    await Promise.resolve()
    expect(pendingCountsAtBackup).toEqual([])
    releaseEnumeration?.()
    await active
    await expect(confirmation).resolves.toMatchObject({ status: 'failed' })
    expect(pendingCountsAtBackup).toEqual([0])
    expect(orchestrationRepository.countPendingMutations()).toBe(0)
  })

  it('journals local work without provider calls while disabled and uploads it after re-enabling', async () => {
    bindOldProvider()
    repository.createResolvedBaseline(
      SyncProviderEnum.GoogleDrive,
      getWorkspaceId(),
      false
    )
    const initialPendingMutationCount =
      orchestrationRepository.countPendingMutations()
    const getIdentity = vi.spyOn(googleAdapter, 'getIdentity')
    const discoverWorkspace = vi.spyOn(googleAdapter, 'discoverWorkspace')
    const enumerateObjects = vi.spyOn(googleAdapter, 'enumerateObjects')
    const listChanges = vi.spyOn(googleAdapter, 'listChanges')
    const createDocument = vi.spyOn(googleAdapter, 'createDocument')

    await service.disable()
    const noteId = populateLocal()
    const note = databaseService
      .getConnection()
      .prepare(
        `SELECT mutation_id AS mutationId, modified_at AS modifiedAt
        FROM notes WHERE id = ?`
      )
      .get(noteId) as { mutationId: string; modifiedAt: string }
    enqueueSyncOutboxMutation(databaseService.getConnection(), {
      entityKind: SyncEntityKindEnum.Note,
      entityId: noteId,
      intent: SyncMutationIntentEnum.Upsert,
      mutationId: note.mutationId,
      modifiedAt: note.modifiedAt,
    })

    expect(orchestrationRepository.getAccountState()).toMatchObject({
      isEnabled: false,
      activeProvider: SyncProviderEnum.GoogleDrive,
      providerAccountId: 'fake-account',
      providerWorkspaceId: getWorkspaceId(),
    })
    expect(orchestrationRepository.countPendingMutations()).toBe(
      initialPendingMutationCount + 1
    )
    await expect(service.repair()).rejects.toThrow(
      'must be enabled before it can be repaired'
    )
    expect(getIdentity).not.toHaveBeenCalled()
    expect(discoverWorkspace).not.toHaveBeenCalled()
    expect(enumerateObjects).not.toHaveBeenCalled()
    expect(listChanges).not.toHaveBeenCalled()
    expect(createDocument).not.toHaveBeenCalled()

    await service.enable()
    await reconciliationService.run(googleAdapter, {
      claimedBy: 're-enabled-device',
    })

    expect(orchestrationRepository.getAccountState().isEnabled).toBe(true)
    expect(orchestrationRepository.countPendingMutations()).toBe(0)
    expect(googleAdapter.getObject(`notes/${noteId}.json`)).toBeDefined()
  })

  it('rejects re-enabling synchronization without a retained binding', async () => {
    await expect(service.enable()).rejects.toThrow(
      'can only be re-enabled for a paired workspace'
    )
  })
  it('serializes disconnect and reset behind active synchronization', async () => {
    bindOldProvider()
    populateLocal()
    repository.createResolvedBaseline(
      SyncProviderEnum.GoogleDrive,
      getWorkspaceId(),
      false
    )
    const originalEnumerate = googleAdapter.enumerateObjects.bind(googleAdapter)
    let releaseEnumeration: (() => void) | undefined
    let enumerationStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      enumerationStarted = resolve
    })
    const gate = new Promise<void>((resolve) => {
      releaseEnumeration = resolve
    })
    googleAdapter.enumerateObjects = async (pageToken?: string) => {
      enumerationStarted?.()
      await gate
      return originalEnumerate(pageToken)
    }
    const active = reconciliationService.run(googleAdapter, {
      claimedBy: 'active-before-disconnect',
    })
    await started

    const disconnect = service.disconnect()
    await Promise.resolve()
    expect(orchestrationRepository.getAccountState().isEnabled).toBe(true)
    releaseEnumeration?.()
    await active
    await disconnect
    expect(orchestrationRepository.getAccountState().isEnabled).toBe(false)

    bindOldProvider()
    const originalListChanges = googleAdapter.listChanges.bind(googleAdapter)
    let releaseChanges: (() => void) | undefined
    let changesStarted: (() => void) | undefined
    const changesWereStarted = new Promise<void>((resolve) => {
      changesStarted = resolve
    })
    const changesGate = new Promise<void>((resolve) => {
      releaseChanges = resolve
    })
    googleAdapter.listChanges = async (cursor, pageToken) => {
      changesStarted?.()
      await changesGate
      return originalListChanges(cursor, pageToken)
    }
    const activeBeforeReset = reconciliationService.run(googleAdapter, {
      claimedBy: 'active-before-reset',
    })
    await changesWereStarted
    const reset = service.reset()
    await Promise.resolve()
    expect(orchestrationRepository.getAccountState().isEnabled).toBe(true)
    releaseChanges?.()
    await activeBeforeReset
    await reset
    expect(orchestrationRepository.getAccountState().isEnabled).toBe(false)
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM sync_remote_objects')
        .get()
    ).toEqual({ count: 0 })
  })

  it('resets provider mappings and cursors when adopting another workspace', async () => {
    bindOldProvider()
    populateLocal()
    repository.createResolvedBaseline(
      SyncProviderEnum.GoogleDrive,
      getWorkspaceId(),
      false
    )
    const oldWorkspaceId = getWorkspaceId()
    await reconciliationService.run(googleAdapter, { claimedBy: 'old-state' })
    const remoteWorkspaceId = uuidV4()
    seedRemote(googleAdapter, remoteWorkspaceId)

    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
      workspaceId: remoteWorkspaceId,
    })
    await expect(
      service.confirm(prepared.id, {
        decision: SyncPairingDecisionEnum.Merge,
      })
    ).resolves.toMatchObject({ status: 'completed' })

    const database = databaseService.getConnection()
    expect(
      database
        .prepare(
          'SELECT COUNT(*) AS count FROM sync_remote_objects WHERE workspace_id = ?'
        )
        .get(oldWorkspaceId)
    ).toEqual({ count: 0 })
    expect(
      database
        .prepare(
          'SELECT COUNT(*) AS count FROM sync_provider_cursors WHERE workspace_id = ?'
        )
        .get(oldWorkspaceId)
    ).toEqual({ count: 0 })
    expect(
      database
        .prepare(
          'SELECT COUNT(*) AS count FROM sync_remote_objects WHERE workspace_id = ?'
        )
        .get(remoteWorkspaceId)
    ).toEqual({ count: 3 })
  })

  it('restores the verified backup and keeps the old provider active after interruption', async () => {
    bindOldProvider()
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.OneDrive,
      retainPendingWork: true,
    })
    oneDriveAdapter.queueFailure(
      'enumerate',
      new SyncProviderError(
        SyncProviderErrorKindEnum.Transient,
        'interrupted provider switch'
      )
    )

    const failed = await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })

    expect(failed).toMatchObject({
      status: 'failed',
      errorCode: 'pairing-failed',
      backupPath: expect.stringContaining('before-sync-pairing'),
    })
    expect(recordPairingFailure).toHaveBeenCalledWith({
      error: expect.any(SyncProviderError),
      errorCode: 'pairing-failed',
      operation: 'confirm',
      provider: SyncProviderEnum.OneDrive,
    })
    expect(orchestrationRepository.getAccountState()).toMatchObject({
      activeProvider: SyncProviderEnum.GoogleDrive,
      providerAccountId: 'fake-account',
    })
  })

  it('uses the provider-native account identity for a new pairing', async () => {
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })

    expect(prepared.accountId).toBe('fake-account')
  })

  it('detects a manually removed bound workspace during repair', async () => {
    bindOldProvider()
    googleAdapter = new FakeSyncProviderAdapter()

    await expect(service.repair()).rejects.toThrow(
      'bound provider workspace is missing'
    )
  })
  it('leaves data intact when backup creation fails before confirmation', async () => {
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })
    vi.spyOn(databaseService, 'createVerifiedBackup').mockImplementation(() => {
      throw new Error('backup failed')
    })

    await expect(
      service.confirm(prepared.id, {
        decision: SyncPairingDecisionEnum.Seed,
      })
    ).rejects.toThrow('backup failed')
    expect(service.get(prepared.id).status).toBe('prepared')
    expect(orchestrationRepository.getAccountState().activeProvider).toBeNull()
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM notes')
        .get()
    ).toEqual({ count: 1 })
  })

  it('recovers an interrupted applying operation from its verified backup', async () => {
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })
    const backupPath = databaseService.createVerifiedBackup(
      'interrupted-pairing-test'
    )
    if (!backupPath) {
      throw new Error('Expected a persistent test backup.')
    }
    repository.setApplying(
      prepared.id,
      SyncPairingDecisionEnum.Seed,
      backupPath
    )

    service.onModuleInit()

    expect(service.get(prepared.id)).toMatchObject({
      status: 'failed',
      errorCode: 'pairing-interrupted',
    })
    expect(orchestrationRepository.getAccountState().activeProvider).toBeNull()
  })

  it('disconnects and resets local sync metadata without deleting local or cloud data', async () => {
    populateLocal()
    const prepared = await service.prepare({
      provider: SyncProviderEnum.GoogleDrive,
    })
    await service.confirm(prepared.id, {
      decision: SyncPairingDecisionEnum.Seed,
    })
    const workspaceId = getWorkspaceId()

    await service.disconnect()

    expect(orchestrationRepository.getAccountState()).toMatchObject({
      isEnabled: false,
      activeProvider: null,
    })
    await expect(googleAdapter.listWorkspaces()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerWorkspaceId: workspaceId }),
      ])
    )

    await service.reset()

    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM notes')
        .get()
    ).toEqual({ count: 1 })
    expect(
      databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM sync_remote_objects')
        .get()
    ).toEqual({ count: 0 })
    expect(googleAdapter.getObject('workspace.json')).toBeDefined()
  })
})
