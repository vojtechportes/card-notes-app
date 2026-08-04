import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../../../src/modules/database/database.service'
import { NotesRepository } from '../../../src/modules/notes/notes.repository'
import { SyncConflictRepository } from '../../../src/modules/sync/sync-conflict.repository'
import { SyncConflictService } from '../../../src/modules/sync/sync-conflict.service'
import { SyncConflictResolutionStateEnum } from '../../../src/modules/sync/types/sync-conflict-resolution-state-enum'
import { SyncConflictTypeEnum } from '../../../src/modules/sync/types/sync-conflict-type-enum'
import { SyncEntityKindEnum } from '../../../src/modules/sync/types/sync-entity-kind-enum'
import type { SyncNoteDocument } from '../../../src/modules/sync/types/sync-note-document'
import { applyRemoteNoteDocument } from '../../../src/modules/sync/utils/apply-remote-note-document.util'
import { mapSyncDocument } from '../../../src/modules/sync/utils/map-sync-document.util'

const remoteDeviceId = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-07-31T12:00:00.000Z'

let databaseService: DatabaseService
let conflictRepository: SyncConflictRepository
let conflictService: SyncConflictService

const activateSynchronization = (): {
  workspaceId: string
  noteTypeId: string
  deviceId: string
  columnId: string
} => {
  const database = databaseService.getConnection()
  const identity = database
    .prepare(
      `SELECT workspace_id AS workspaceId, device_id AS deviceId
      FROM sync_identity WHERE id = 1`
    )
    .get() as { workspaceId: string; deviceId: string }
  const noteType = database
    .prepare('SELECT id FROM note_types ORDER BY created_at LIMIT 1')
    .get() as { id: string }
  const column = database
    .prepare(
      'SELECT id FROM note_columns WHERE note_type_id = ? ORDER BY sort_order LIMIT 1'
    )
    .get(noteType.id) as { id: string }

  database
    .prepare(
      `UPDATE sync_account_state SET is_enabled = 1,
      active_provider = 'google-drive', connection_state = 'connected',
      provider_workspace_id = ? WHERE id = 1`
    )
    .run(identity.workspaceId)

  return { ...identity, noteTypeId: noteType.id, columnId: column.id }
}

const createNote = (
  workspaceId: string,
  noteTypeId: string,
  noteId: string,
  mutationId: string,
  columnId: string,
  value: string
): SyncNoteDocument =>
  mapSyncDocument({
    formatVersion: 1,
    workspaceId,
    parentHash: null,
    mutationId,
    modifiedBy: remoteDeviceId,
    modifiedAt: timestamp,
    entityType: 'note',
    entityId: noteId,
    deletedAt: null,
    payload: { noteTypeId, background: null, values: { [columnId]: value } },
  }).document as SyncNoteDocument

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' })
  databaseService.initialize()
  conflictRepository = new SyncConflictRepository(databaseService)
  conflictService = new SyncConflictService(databaseService, conflictRepository)
})

afterEach(() => {
  databaseService.close()
})

describe('SyncConflictService', () => {
  it('persists repeated conflict delivery idempotently with one copy identity', () => {
    const { workspaceId, noteTypeId, columnId } = activateSynchronization()
    const noteId = uuidV4()
    const local = createNote(
      workspaceId,
      noteTypeId,
      noteId,
      uuidV4(),
      columnId,
      'local'
    )
    const remote = createNote(
      workspaceId,
      noteTypeId,
      noteId,
      uuidV4(),
      columnId,
      'remote'
    )
    const input = {
      workspaceId,
      conflict: {
        conflictType: SyncConflictTypeEnum.EditEdit,
        entityKind: SyncEntityKindEnum.Note,
        entityId: noteId,
        fieldPaths: [`payload.values.${columnId}`],
        baseDocument: null,
        localDocument: local,
        remoteDocument: remote,
        conflictCopyDocument: remote,
      },
    }

    const first = conflictRepository.save({
      ...input,
      conflictCopyEntityId: uuidV4(),
    })
    const repeated = conflictRepository.save({
      ...input,
      conflictCopyEntityId: uuidV4(),
    })

    expect(repeated.id).toBe(first.id)
    expect(repeated.conflictCopyEntityId).toBe(first.conflictCopyEntityId)
    expect(conflictService.listUnresolved()).toHaveLength(1)
  })

  it.each([
    ['local', 'remote'],
    ['remote', 'local'],
  ] as const)(
    'retains the active %s version and the preserved %s copy without reapplying either',
    (activeValue, copyValue) => {
      const { workspaceId, noteTypeId, columnId } = activateSynchronization()
      const noteId = uuidV4()
      const copyId = uuidV4()
      const local = createNote(
        workspaceId,
        noteTypeId,
        noteId,
        uuidV4(),
        columnId,
        'local'
      )
      const remote = createNote(
        workspaceId,
        noteTypeId,
        noteId,
        uuidV4(),
        columnId,
        'remote'
      )
      const active = activeValue === 'local' ? local : remote
      const copy = createNote(
        workspaceId,
        noteTypeId,
        copyId,
        uuidV4(),
        columnId,
        copyValue
      )
      applyRemoteNoteDocument(databaseService.getConnection(), active)
      applyRemoteNoteDocument(databaseService.getConnection(), copy)
      const conflict = conflictRepository.save({
        workspaceId,
        conflict: {
          conflictType: SyncConflictTypeEnum.EditEdit,
          entityKind: SyncEntityKindEnum.Note,
          entityId: noteId,
          fieldPaths: [`payload.values.${columnId}`],
          baseDocument: null,
          localDocument: local,
          remoteDocument: remote,
          conflictCopyDocument: copyValue === 'local' ? local : remote,
        },
        conflictCopyEntityId: copyId,
      })

      const resolved = conflictService.resolve({
        conflictId: conflict.id,
        resolutionState: SyncConflictResolutionStateEnum.ResolvedMerged,
        retainBoth: true,
      })
      const values = databaseService
        .getConnection()
        .prepare(
          `SELECT notes.id, note_values.value_json AS valueJson
          FROM notes INNER JOIN note_values ON note_values.note_id = notes.id
          WHERE notes.id IN (?, ?) AND note_values.column_id = ?
          ORDER BY notes.id`
        )
        .all(noteId, copyId, columnId) as Array<{
        id: string
        valueJson: string
      }>
      const valueById = new Map(
        values.map((value) => [value.id, JSON.parse(value.valueJson)])
      )
      const outboxCount = databaseService
        .getConnection()
        .prepare('SELECT COUNT(*) AS count FROM sync_outbox')
        .get() as { count: number }

      expect(resolved.resolutionState).toBe(
        SyncConflictResolutionStateEnum.ResolvedMerged
      )
      expect(valueById.get(noteId)).toBe(activeValue)
      expect(valueById.get(copyId)).toBe(copyValue)
      expect(outboxCount.count).toBe(0)
    }
  )

  it('rejects unavailable resolution documents without clearing the conflict', () => {
    const { workspaceId, noteTypeId, columnId } = activateSynchronization()
    const noteId = uuidV4()
    const local = createNote(
      workspaceId,
      noteTypeId,
      noteId,
      uuidV4(),
      columnId,
      'local'
    )
    const conflict = conflictRepository.save({
      workspaceId,
      conflict: {
        conflictType: SyncConflictTypeEnum.RemoteCorruption,
        entityKind: SyncEntityKindEnum.Note,
        entityId: noteId,
        fieldPaths: ['$remote.corrupt'],
        baseDocument: null,
        localDocument: local,
        remoteDocument: null,
      },
    })

    expect(() =>
      conflictService.resolve({
        conflictId: conflict.id,
        resolutionState: SyncConflictResolutionStateEnum.ResolvedRemote,
      })
    ).toThrow(/no document for the selected resolution/)
    expect(() =>
      conflictService.resolve({
        conflictId: conflict.id,
        resolutionState: SyncConflictResolutionStateEnum.ResolvedMerged,
      })
    ).toThrow(/no document for the selected resolution/)
    expect(conflictService.findById(conflict.id)?.resolutionState).toBe(
      SyncConflictResolutionStateEnum.Unresolved
    )
  })
  it('resolves a conflict transactionally and repeated resolution is idempotent', () => {
    const { workspaceId, noteTypeId, columnId } = activateSynchronization()
    const noteId = uuidV4()
    new NotesRepository(databaseService).create(
      noteId,
      noteTypeId,
      {},
      timestamp
    )
    const local = createNote(
      workspaceId,
      noteTypeId,
      noteId,
      uuidV4(),
      columnId,
      'local'
    )
    const remote = createNote(
      workspaceId,
      noteTypeId,
      noteId,
      uuidV4(),
      columnId,
      'remote'
    )
    const conflict = conflictRepository.save({
      workspaceId,
      conflict: {
        conflictType: SyncConflictTypeEnum.EditEdit,
        entityKind: SyncEntityKindEnum.Note,
        entityId: noteId,
        fieldPaths: [`payload.values.${columnId}`],
        baseDocument: null,
        localDocument: local,
        remoteDocument: remote,
      },
    })

    const first = conflictService.resolve({
      conflictId: conflict.id,
      resolutionState: SyncConflictResolutionStateEnum.ResolvedRemote,
    })
    const repeated = conflictService.resolve({
      conflictId: conflict.id,
      resolutionState: SyncConflictResolutionStateEnum.ResolvedLocal,
    })
    const storedValue = databaseService
      .getConnection()
      .prepare(
        `SELECT value_json AS valueJson FROM note_values
        WHERE note_id = ? AND column_id = ?`
      )
      .get(noteId, columnId) as { valueJson: string }
    const outboxCount = databaseService
      .getConnection()
      .prepare('SELECT COUNT(*) AS count FROM sync_outbox')
      .get() as { count: number }

    expect(first.resolutionState).toBe(
      SyncConflictResolutionStateEnum.ResolvedRemote
    )
    expect(repeated.resolutionState).toBe(
      SyncConflictResolutionStateEnum.ResolvedRemote
    )
    expect(JSON.parse(storedValue.valueJson)).toBe('remote')
    expect(outboxCount.count).toBe(1)
  })
})
