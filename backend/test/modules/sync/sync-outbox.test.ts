import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Workbook } from 'exceljs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AssetsRepository } from '../../../src/modules/assets/assets.repository'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { ExportImportService } from '../../../src/modules/export-import/export-import.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { NotesService } from '../../../src/modules/notes/notes.service'
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository'
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository'
import { LabelsRepository } from '../../../src/modules/settings/labels.repository'
import { LabelsService } from '../../../src/modules/settings/labels.service'
import { NoteTypesRepository } from '../../../src/modules/settings/note-types.repository'
import { SettingsService } from '../../../src/modules/settings/settings.service'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'
import { DeleteNoteTypeModeEnum } from '../../../src/modules/settings/types/delete-note-type-mode-enum'
import { SyncOutboxRepository } from '../../../src/modules/sync/sync-outbox.repository'
import { SyncEntityKindEnum } from '../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from '../../../src/modules/sync/types/sync-mutation-intent-enum'
import { SyncOutboxStatusEnum } from '../../../src/modules/sync/types/sync-outbox-status-enum'
import { createSyncTargetHash } from '../../../src/modules/sync/utils/create-sync-target-hash.util'
import { enqueueSyncOutboxMutation } from '../../../src/modules/sync/utils/enqueue-sync-outbox-mutation.util'
import { isUuidV4 } from '../../../src/modules/sync/utils/is-uuid-v4.util'

interface TestServices {
  columnsRepository: ColumnsRepository
  databaseService: DatabaseService
  exportImportService: ExportImportService
  labelsService: LabelsService
  notesRepository: NotesRepository
  notesService: NotesService
  outboxRepository: SyncOutboxRepository
  settingsService: SettingsService
}

const temporaryDirectories: string[] = []
let services: TestServices

const createServices = (filePath = ':memory:'): TestServices => {
  const databaseService = new DatabaseService({ filePath })
  databaseService.initialize()
  const columnsRepository = new ColumnsRepository(databaseService)
  const generalSettingsRepository = new GeneralSettingsRepository(
    databaseService
  )
  const labelsRepository = new LabelsRepository(databaseService)
  const noteTypesRepository = new NoteTypesRepository(databaseService)
  const notesRepository = new NotesRepository(databaseService)
  const settingsService = new SettingsService(
    columnsRepository,
    generalSettingsRepository,
    noteTypesRepository,
    notesRepository,
    labelsRepository
  )
  settingsService.onModuleInit()
  const labelsService = new LabelsService(labelsRepository, noteTypesRepository)
  const notesService = new NotesService(
    notesRepository,
    settingsService,
    labelsService
  )

  return {
    columnsRepository,
    databaseService,
    exportImportService: new ExportImportService(
      databaseService,
      settingsService,
      notesService
    ),
    labelsService,
    notesRepository,
    notesService,
    outboxRepository: new SyncOutboxRepository(databaseService),
    settingsService,
  }
}

const bindWorkspace = (databaseService: DatabaseService): void => {
  databaseService
    .getConnection()
    .prepare(
      `UPDATE sync_account_state
       SET provider_workspace_id = ?, provider_workspace_display_name = ?,
           active_provider = 'google-drive', connection_state = 'disconnected'
       WHERE id = 1`
    )
    .run('provider-workspace', 'Test workspace')
}

beforeEach(() => {
  services = createServices()
})

afterEach(() => {
  services.databaseService.close()
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('durable transactional synchronization outbox', () => {
  it('does not journal pre-pairing history and journals bound workspaces while disabled', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const beforeBinding = services.settingsService.createColumn(noteType.id, {
      name: 'local-only',
      title: 'Local only',
      type: ColumnTypeEnum.Text,
    })
    services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [beforeBinding.id]: 'Before pairing' },
    })

    expect(services.outboxRepository.findAll()).toEqual([])

    bindWorkspace(services.databaseService)
    const syncedColumn = services.settingsService.createColumn(noteType.id, {
      name: 'synced',
      title: 'Synced',
      type: ColumnTypeEnum.Text,
    })
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [syncedColumn.id]: 'After pairing' },
    })
    const entries = services.outboxRepository.findAll()

    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.entityKind).sort()).toEqual([
      SyncEntityKindEnum.Configuration,
      SyncEntityKindEnum.Note,
    ])
    expect(entries.find((entry) => entry.entityId === note.id)).toMatchObject({
      intent: SyncMutationIntentEnum.Upsert,
      status: SyncOutboxStatusEnum.Pending,
    })
    expect(entries.every((entry) => isUuidV4(entry.mutationId))).toBe(true)
    expect(
      entries.every((entry) => /^[a-f0-9]{64}$/.test(entry.targetHash))
    ).toBe(true)
    const noteEntry = entries.find((entry) => entry.entityId === note.id)
    enqueueSyncOutboxMutation(services.databaseService.getConnection(), {
      entityKind: SyncEntityKindEnum.Note,
      entityId: note.id,
      intent: SyncMutationIntentEnum.Upsert,
      mutationId: noteEntry?.latestMutationId ?? '',
      modifiedAt: noteEntry?.updatedAt ?? '',
    })
    expect(services.outboxRepository.findAll()).toHaveLength(2)
  })

  it('coalesces pending note and configuration edits while preserving identity and base hash', () => {
    bindWorkspace(services.databaseService)
    const database = services.databaseService.getConnection()
    const identity = database
      .prepare('SELECT workspace_id FROM sync_identity WHERE id = 1')
      .get() as { workspace_id: string }
    database
      .prepare(
        `INSERT INTO sync_remote_objects (
          id, workspace_id, provider, logical_key, entity_kind,
          provider_object_id, provider_version, content_hash
        ) VALUES (?, ?, 'google-drive', 'config.json', 'configuration', ?, ?, ?)`
      )
      .run(
        'remote-config',
        identity.workspace_id,
        'remote-config-id',
        'v1',
        'a'.repeat(64)
      )
    database
      .prepare(
        `INSERT INTO sync_remote_objects (
          id, workspace_id, provider, logical_key, entity_kind,
          provider_object_id, provider_version, content_hash, updated_at
        ) VALUES (?, ?, 'one-drive', 'config.json', 'configuration', ?, ?, ?, ?)`
      )
      .run(
        'old-provider-config',
        identity.workspace_id,
        'old-provider-config-id',
        'v2',
        'b'.repeat(64),
        '2099-01-01T00:00:00.000Z'
      )
    const noteType = services.settingsService.createNoteType({ title: 'Books' })
    const initial = services.outboxRepository
      .findAll()
      .find((entry) => entry.entityKind === SyncEntityKindEnum.Configuration)

    services.settingsService.updateNoteType(noteType.id, { title: 'Library' })
    services.settingsService.updateGeneralSettings({
      textTruncationLength: 80,
    })
    const [coalesced] = services.outboxRepository.findAll()

    expect(coalesced.mutationId).toBe(initial?.mutationId)
    expect(coalesced.latestMutationId).not.toBe(initial?.latestMutationId)
    expect(coalesced.baseHash).toBe('a'.repeat(64))
    expect(coalesced.coalescedCount).toBeGreaterThanOrEqual(2)
    expect(coalesced.targetHash).not.toBe(initial?.targetHash)
  })

  it('keeps a newer edit pending when an older mutation is claimed and completed', () => {
    bindWorkspace(services.databaseService)
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    })
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'First' },
    })
    const claimed = services.outboxRepository
      .claimAvailable({
        claimedBy: 'worker-a',
        leaseDurationMs: 30_000,
        limit: 10,
        now: new Date('2026-07-31T10:00:00.000Z'),
      })
      .find((entry) => entry.entityId === note.id)

    expect(claimed?.status).toBe(SyncOutboxStatusEnum.Claimed)
    services.notesService.updateNote(note.id, {
      values: { [column.id]: 'Second' },
    })
    expect(
      services.outboxRepository
        .findAll()
        .filter((entry) => entry.entityId === note.id)
    ).toHaveLength(2)

    expect(
      services.outboxRepository.complete(
        claimed?.mutationId ?? '',
        claimed?.claimToken ?? '',
        '2026-07-31T10:00:01.000Z'
      )
    ).toBe(true)
    expect(
      services.outboxRepository.complete(
        claimed?.mutationId ?? '',
        claimed?.claimToken ?? '',
        '2026-07-31T10:00:01.000Z'
      )
    ).toBe(true)
    const noteEntries = services.outboxRepository
      .findAll()
      .filter((entry) => entry.entityId === note.id)

    expect(noteEntries.map((entry) => entry.status).sort()).toEqual([
      SyncOutboxStatusEnum.Completed,
      SyncOutboxStatusEnum.Pending,
    ])
  })

  it('renews active leases without allowing expired owners to extend them', () => {
    bindWorkspace(services.databaseService)
    services.settingsService.updateGeneralSettings({ cardFieldDisplayCount: 2 })
    const [claim] = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-a',
      leaseDurationMs: 1_000,
      limit: 1,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })

    expect(
      services.outboxRepository.renewClaim(
        claim.mutationId,
        claim.claimToken ?? '',
        1_000,
        new Date('2026-07-31T10:00:00.500Z')
      )
    ).toBe(true)
    expect(
      services.outboxRepository.claimAvailable({
        claimedBy: 'worker-b',
        leaseDurationMs: 1_000,
        limit: 1,
        now: new Date('2026-07-31T10:00:01.000Z'),
      })
    ).toEqual([])
    expect(
      services.outboxRepository.renewClaim(
        claim.mutationId,
        claim.claimToken ?? '',
        1_000,
        new Date('2026-07-31T10:00:01.500Z')
      )
    ).toBe(false)
    expect(
      services.outboxRepository.claimAvailable({
        claimedBy: 'worker-b',
        leaseDurationMs: 1_000,
        limit: 1,
        now: new Date('2026-07-31T10:00:01.500Z'),
      })
    ).toHaveLength(1)
  })
  it('recovers expired claims and retry state after reopening the database', () => {
    services.databaseService.close()
    const directory = mkdtempSync(join(tmpdir(), 'notestack-outbox-'))
    temporaryDirectories.push(directory)
    const databasePath = join(directory, 'notestack.sqlite')
    services = createServices(databasePath)
    bindWorkspace(services.databaseService)
    services.settingsService.updateGeneralSettings({ cardFieldDisplayCount: 4 })
    const [claim] = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-a',
      leaseDurationMs: 1_000,
      limit: 1,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })

    services.databaseService.close()
    services = createServices(databasePath)

    expect(
      services.outboxRepository.claimAvailable({
        claimedBy: 'worker-b',
        leaseDurationMs: 1_000,
        limit: 1,
        now: new Date('2026-07-31T10:00:00.500Z'),
      })
    ).toEqual([])
    const [recoveredClaim] = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-b',
      leaseDurationMs: 1_000,
      limit: 1,
      now: new Date('2026-07-31T10:00:01.000Z'),
    })

    expect(recoveredClaim.mutationId).toBe(claim.mutationId)
    expect(recoveredClaim.attemptCount).toBe(2)
    expect(
      services.outboxRepository.fail({
        mutationId: recoveredClaim.mutationId,
        claimToken: recoveredClaim.claimToken ?? '',
        failureClassification: 'rate-limited',
        nextAttemptAt: '2026-07-31T10:00:05.000Z',
        failedAt: '2026-07-31T10:00:02.000Z',
      })
    ).toBe(true)
    services.databaseService.close()
    services = createServices(databasePath)

    expect(
      services.outboxRepository.claimAvailable({
        claimedBy: 'worker-c',
        leaseDurationMs: 1_000,
        limit: 1,
        now: new Date('2026-07-31T10:00:04.000Z'),
      })
    ).toEqual([])
    const [reclaimed] = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-c',
      leaseDurationMs: 1_000,
      limit: 1,
      now: new Date('2026-07-31T10:00:05.000Z'),
    })

    expect(reclaimed.mutationId).toBe(claim.mutationId)
    expect(reclaimed.claimedBy).toBe('worker-c')
    expect(reclaimed.attemptCount).toBe(3)
    expect(reclaimed.lastFailureClassification).toBe('rate-limited')
  })

  it('journals JSON imports through the same transactional domain paths', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'import-summary',
      title: 'Import summary',
      type: ColumnTypeEnum.Text,
    })
    services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'Portable note' },
    })
    const payload = services.exportImportService.exportData()

    bindWorkspace(services.databaseService)
    const result = services.exportImportService.importData(payload)
    const entries = services.outboxRepository.findAll()

    expect(result.importedNotes).toBe(1)
    expect(
      entries.filter(
        (entry) => entry.entityKind === SyncEntityKindEnum.Configuration
      )
    ).toHaveLength(1)
    expect(
      entries.filter((entry) => entry.entityKind === SyncEntityKindEnum.Note)
    ).toHaveLength(1)
  })
  it('supersedes an expired stale claim when newer pending work exists', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'lease-summary',
      title: 'Lease summary',
      type: ColumnTypeEnum.Text,
    })
    bindWorkspace(services.databaseService)
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'First' },
    })
    const [claimed] = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-a',
      leaseDurationMs: 1_000,
      limit: 1,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })

    services.notesService.updateNote(note.id, {
      values: { [column.id]: 'Second' },
    })
    const reclaimed = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-b',
      leaseDurationMs: 1_000,
      limit: 10,
      now: new Date('2026-07-31T10:00:01.000Z'),
    })
    const entries = services.outboxRepository
      .findAll()
      .filter((entry) => entry.entityId === note.id)

    expect(reclaimed).toHaveLength(1)
    expect(reclaimed[0].mutationId).not.toBe(claimed.mutationId)
    expect(
      entries.find((entry) => entry.mutationId === claimed.mutationId)?.status
    ).toBe(SyncOutboxStatusEnum.Superseded)
  })

  it('supersedes a failed stale claim when newer pending work exists', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'failure-summary',
      title: 'Failure summary',
      type: ColumnTypeEnum.Text,
    })
    bindWorkspace(services.databaseService)
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'First' },
    })
    const [claimed] = services.outboxRepository.claimAvailable({
      claimedBy: 'worker-a',
      leaseDurationMs: 30_000,
      limit: 1,
    })

    services.notesService.updateNote(note.id, {
      values: { [column.id]: 'Second' },
    })
    expect(
      services.outboxRepository.fail({
        mutationId: claimed.mutationId,
        claimToken: claimed.claimToken ?? '',
        failureClassification: 'offline',
        nextAttemptAt: '2026-07-31T11:00:00.000Z',
      })
    ).toBe(true)
    expect(
      services.outboxRepository
        .findAll()
        .find((entry) => entry.mutationId === claimed.mutationId)?.status
    ).toBe(SyncOutboxStatusEnum.Superseded)
  })

  it('journals note updates and tombstones for background and delete-all paths', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'destructive-summary',
      title: 'Destructive summary',
      type: ColumnTypeEnum.Text,
    })
    bindWorkspace(services.databaseService)
    const first = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'First' },
    })
    const second = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'Second' },
    })

    services.notesService.updateNoteBackground(first.id, 'CREAM' as never)
    expect(services.notesService.deleteAllNotes()).toBe(2)
    const noteEntries = services.outboxRepository
      .findAll()
      .filter((entry) => entry.entityKind === SyncEntityKindEnum.Note)

    expect(noteEntries).toHaveLength(2)
    expect(
      noteEntries.every(
        (entry) => entry.intent === SyncMutationIntentEnum.Tombstone
      )
    ).toBe(true)
    expect(
      noteEntries.find((entry) => entry.entityId === first.id)?.coalescedCount
    ).toBe(2)
    expect(
      noteEntries.find((entry) => entry.entityId === second.id)?.coalescedCount
    ).toBe(1)
  })

  it('journals column value cleanup as configuration and note changes', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'cleanup-summary',
      title: 'Cleanup summary',
      type: ColumnTypeEnum.Text,
    })
    bindWorkspace(services.databaseService)
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'Remove me' },
    })

    services.settingsService.deleteColumn(noteType.id, column.id, {
      deleteNoteData: true,
    })
    const entries = services.outboxRepository.findAll()

    expect(
      entries.filter(
        (entry) => entry.entityKind === SyncEntityKindEnum.Configuration
      )
    ).toHaveLength(1)
    expect(
      entries.find((entry) => entry.entityId === note.id)?.coalescedCount
    ).toBe(1)
  })

  it('journals note-type moves and configuration tombstones atomically', () => {
    const source = services.settingsService.createNoteType({ title: 'Source' })
    const target = services.settingsService.createNoteType({ title: 'Target' })
    const sourceColumn = services.settingsService.createColumn(source.id, {
      name: 'source-summary',
      title: 'Source summary',
      type: ColumnTypeEnum.Text,
    })
    const targetColumn = services.settingsService.createColumn(target.id, {
      name: 'target-summary',
      title: 'Target summary',
      type: ColumnTypeEnum.Text,
    })
    bindWorkspace(services.databaseService)
    const note = services.notesService.createNote({
      noteTypeId: source.id,
      values: { [sourceColumn.id]: 'Move me' },
    })

    services.settingsService.deleteNoteType(source.id, {
      mode: DeleteNoteTypeModeEnum.MoveNotes,
      targetNoteTypeId: target.id,
      fieldMappings: [
        {
          sourceColumnId: sourceColumn.id,
          targetColumnId: targetColumn.id,
        },
      ],
    })
    const entries = services.outboxRepository.findAll()

    expect(
      entries.filter(
        (entry) => entry.entityKind === SyncEntityKindEnum.Configuration
      )
    ).toHaveLength(1)
    expect(
      entries.find((entry) => entry.entityId === note.id)?.coalescedCount
    ).toBe(1)
    expect(services.notesRepository.findById(note.id)).toMatchObject({
      noteTypeId: target.id,
      values: { [targetColumn.id]: 'Move me' },
    })
  })
  it('keeps hashes stable across equivalent JSON and local asset metadata', () => {
    const noteType = services.settingsService.getDefaultNoteType()
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'hash-image',
      title: 'Hash image',
      type: ColumnTypeEnum.Image,
    })
    const note = services.notesRepository.create(
      'hash-note',
      noteType.id,
      { [column.id]: { assetId: 'a'.repeat(64), fileName: 'a.png' } },
      '2026-07-31T10:00:00.000Z'
    )
    const database = services.databaseService.getConnection()
    const firstNoteHash = createSyncTargetHash(
      database,
      SyncEntityKindEnum.Note,
      note.id
    )
    database
      .prepare(
        'UPDATE note_values SET value_json = ? WHERE note_id = ? AND column_id = ?'
      )
      .run(
        JSON.stringify({ fileName: 'a.png', assetId: 'a'.repeat(64) }),
        note.id,
        column.id
      )
    const secondNoteHash = createSyncTargetHash(
      database,
      SyncEntityKindEnum.Note,
      note.id
    )

    bindWorkspace(services.databaseService)
    const assetsRepository = new AssetsRepository(services.databaseService)
    assetsRepository.upsert({
      assetId: 'a'.repeat(64),
      extension: 'png',
      integrityState: 'available',
      mimeType: 'image/png',
      relativePath: 'assets/aa/first.png',
      size: 12,
    })
    const firstAssetHash = services.outboxRepository.findAll()[0].targetHash
    assetsRepository.upsert({
      assetId: 'a'.repeat(64),
      extension: 'png',
      integrityState: 'corrupt',
      mimeType: 'image/png',
      relativePath: 'assets/aa/second.png',
      size: 12,
    })
    const secondAssetHash = services.outboxRepository.findAll()[0].targetHash

    expect(secondNoteHash).toBe(firstNoteHash)
    expect(secondAssetHash).toBe(firstAssetHash)
  })

  it('journals XLSX imports through note repository transactions', async () => {
    const noteType = services.settingsService.getDefaultNoteType()
    services.settingsService.createColumn(noteType.id, {
      name: 'xlsx-summary',
      title: 'XLSX summary',
      type: ColumnTypeEnum.Text,
    })
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Notes')
    worksheet.addRow(['xlsx-summary'])
    worksheet.addRow(['Imported row'])
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    bindWorkspace(services.databaseService)
    const result = await services.exportImportService.importSpreadsheetData(
      buffer,
      noteType.id
    )

    expect(result.importedNotes).toBe(1)
    expect(
      services.outboxRepository
        .findAll()
        .filter((entry) => entry.entityKind === SyncEntityKindEnum.Note)
    ).toHaveLength(1)
  })
  it('rolls cascade domain changes back when outbox persistence fails', () => {
    const noteType = services.settingsService.createNoteType({
      title: 'Rollback cascade',
    })
    const column = services.settingsService.createColumn(noteType.id, {
      name: 'rollback-summary',
      title: 'Rollback summary',
      type: ColumnTypeEnum.Text,
    })
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [column.id]: 'Keep me' },
    })
    bindWorkspace(services.databaseService)
    services.databaseService.getConnection().exec('DROP TABLE sync_outbox')

    expect(() =>
      services.settingsService.deleteNoteType(noteType.id, {
        mode: DeleteNoteTypeModeEnum.DeleteNotes,
      })
    ).toThrow()
    expect(services.settingsService.getNoteType(noteType.id)).toEqual(noteType)
    expect(services.notesRepository.findById(note.id)).toEqual(note)
  })
  it('rolls domain and outbox changes back together', () => {
    bindWorkspace(services.databaseService)
    const database = services.databaseService.getConnection()
    const noteType = services.settingsService.getDefaultNoteType()
    const transaction = database.transaction(() => {
      services.notesRepository.create(
        'rollback-note',
        noteType.id,
        {},
        '2026-07-31T10:00:00.000Z'
      )
      throw new Error('Force rollback')
    })

    expect(() => transaction()).toThrow('Force rollback')
    expect(services.notesRepository.findById('rollback-note')).toBeUndefined()
    expect(
      services.outboxRepository
        .findAll()
        .some((entry) => entry.entityId === 'rollback-note')
    ).toBe(false)
  })

  it('journals cascade cleanup as one configuration target plus affected notes', () => {
    bindWorkspace(services.databaseService)
    const noteType = services.settingsService.createNoteType({ title: 'Tasks' })
    const labelsColumn = services.settingsService.createColumn(noteType.id, {
      name: 'labels',
      title: 'Labels',
      type: ColumnTypeEnum.Labels,
      config: {
        allowMultiple: true,
        sources: { includeShared: false, noteTypeIds: [noteType.id] },
      },
    })
    const label = services.labelsService.createLabel({
      title: 'Urgent',
      name: 'urgent',
      color: '#D20A0A',
      noteTypeId: noteType.id,
    })
    const note = services.notesService.createNote({
      noteTypeId: noteType.id,
      values: { [labelsColumn.id]: [label.id] },
    })

    services.labelsService.deleteLabel(label.id)
    const entries = services.outboxRepository.findAll()

    expect(
      entries.filter(
        (entry) => entry.entityKind === SyncEntityKindEnum.Configuration
      )
    ).toHaveLength(1)
    expect(
      entries.find((entry) => entry.entityId === note.id)?.coalescedCount
    ).toBe(1)
    expect(
      services.notesRepository.findById(note.id)?.values[labelsColumn.id]
    ).toEqual([])
  })
})
