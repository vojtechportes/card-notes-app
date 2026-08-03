import { describe, expect, it } from 'vitest'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'
import type { SyncConfigurationDocument } from '../../../src/modules/sync/types/sync-configuration-document'
import type { SyncNoteDocument } from '../../../src/modules/sync/types/sync-note-document'
import { SyncConflictTypeEnum } from '../../../src/modules/sync/types/sync-conflict-type-enum'
import { createSyncConflictCopyId } from '../../../src/modules/sync/utils/create-sync-conflict-copy-id.util'
import { createSyncConflictCopyMutationId } from '../../../src/modules/sync/utils/create-sync-conflict-copy-mutation-id.util'
import { createSyncNoteConflictCopy } from '../../../src/modules/sync/utils/create-sync-note-conflict-copy.util'
import { mapSyncDocument } from '../../../src/modules/sync/utils/map-sync-document.util'
import { mergeSyncDocument } from '../../../src/modules/sync/utils/merge-sync-document.util'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const noteId = '22222222-2222-4222-8222-222222222222'
const noteTypeId = '33333333-3333-4333-8333-333333333333'
const columnAId = '44444444-4444-4444-8444-444444444444'
const columnBId = '55555555-5555-4555-8555-555555555555'
const settingsId = '66666666-6666-4666-8666-666666666666'
const localDeviceId = '77777777-7777-4777-8777-777777777777'
const remoteDeviceId = '88888888-8888-4888-8888-888888888888'
const timestamp = '2026-07-31T12:00:00.000Z'

const createNote = (
  mutationId: string,
  modifiedBy: string,
  values: Record<string, string>,
  background: SyncNoteDocument['payload'] extends null
    ? never
    : NonNullable<SyncNoteDocument['payload']>['background'] = null,
  deletedAt: string | null = null
): SyncNoteDocument =>
  mapSyncDocument({
    formatVersion: 1,
    workspaceId,
    parentHash: null,
    mutationId,
    modifiedBy,
    modifiedAt: timestamp,
    entityType: 'note',
    entityId: noteId,
    deletedAt,
    payload: deletedAt ? null : { noteTypeId, background, values },
  }).document as SyncNoteDocument

const createConfiguration = (
  mutationId: string,
  modifiedBy: string,
  overrides: {
    noteTypeTitle?: string
    columnATitle?: string
    columnAOrderKey?: string
    columnBOrderKey?: string
    columnANoteTypeId?: string
    truncationLength?: number | null
  } = {}
): SyncConfigurationDocument => {
  const entityMetadata = {
    mutationId,
    modifiedBy,
    modifiedAt: timestamp,
    deletedAt: null,
  }

  return mapSyncDocument({
    formatVersion: 1,
    workspaceId,
    parentHash: null,
    mutationId,
    modifiedBy,
    modifiedAt: timestamp,
    entityType: 'configuration',
    entityId: 'configuration',
    payload: {
      noteTypes: [
        {
          id: noteTypeId,
          ...entityMetadata,
          payload: {
            title: overrides.noteTypeTitle ?? 'Notes',
            orderKey: '00000000',
          },
        },
      ],
      columns: [
        {
          id: columnAId,
          ...entityMetadata,
          payload: {
            noteTypeId: overrides.columnANoteTypeId ?? noteTypeId,
            name: 'title',
            title: overrides.columnATitle ?? 'Title',
            type: ColumnTypeEnum.Text,
            orderKey: overrides.columnAOrderKey ?? '00000000',
            isHidden: false,
            isHiddenInDetail: false,
            isDefault: false,
            config: null,
          },
        },
        {
          id: columnBId,
          ...entityMetadata,
          payload: {
            noteTypeId,
            name: 'body',
            title: 'Body',
            type: ColumnTypeEnum.Text,
            orderKey: overrides.columnBOrderKey ?? '00000001',
            isHidden: false,
            isHiddenInDetail: false,
            isDefault: false,
            config: null,
          },
        },
      ],
      labels: [],
      generalSettings: {
        id: settingsId,
        ...entityMetadata,
        payload: {
          textTruncationLength: overrides.truncationLength ?? null,
          cardFieldDisplayCount: null,
          mergeDateTimeFields: null,
        },
      },
    },
  }).document as SyncConfigurationDocument
}

describe('deterministic synchronization document merge', () => {
  it('merges disjoint fields on the same note', () => {
    const base = createNote(
      '00000000-0000-4000-8000-000000000001',
      localDeviceId,
      {
        [columnAId]: 'base-a',
        [columnBId]: 'base-b',
      }
    )
    const local = createNote(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      {
        [columnAId]: 'local-a',
        [columnBId]: 'base-b',
      }
    )
    const remote = createNote(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      {
        [columnAId]: 'base-a',
        [columnBId]: 'remote-b',
      }
    )

    const result = mergeSyncDocument(base, local, remote)
    const merged = result.document as SyncNoteDocument

    expect(merged.payload?.values).toEqual({
      [columnAId]: 'local-a',
      [columnBId]: 'remote-b',
    })
    expect(result.conflicts).toEqual([])
  })

  it('selects the same primary same-field edit and preserves the other document', () => {
    const base = createNote(
      '00000000-0000-4000-8000-000000000001',
      localDeviceId,
      {
        [columnAId]: 'base',
      }
    )
    const local = createNote(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      {
        [columnAId]: 'local',
      }
    )
    const remote = createNote(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      {
        [columnAId]: 'remote',
      }
    )

    const left = mergeSyncDocument(base, local, remote)
    const right = mergeSyncDocument(base, remote, local)

    expect(left.document.contentHash).toBe(right.document.contentHash)
    expect(left.conflicts[0]).toMatchObject({
      conflictType: SyncConflictTypeEnum.EditEdit,
      fieldPaths: [`payload.values.${columnAId}`],
    })
    expect(left.conflicts[0].conflictCopyDocument).toBeDefined()
    const leftCopyId = createSyncConflictCopyId(workspaceId, left.conflicts[0])
    const rightCopyId = createSyncConflictCopyId(
      workspaceId,
      right.conflicts[0]
    )
    const leftSource = left.conflicts[0]
      .conflictCopyDocument as SyncNoteDocument
    const rightSource = right.conflicts[0]
      .conflictCopyDocument as SyncNoteDocument
    const leftCopy = createSyncNoteConflictCopy(
      leftSource,
      leftCopyId,
      createSyncConflictCopyMutationId(leftCopyId),
      leftSource.modifiedBy,
      leftSource.modifiedAt
    )
    const rightCopy = createSyncNoteConflictCopy(
      rightSource,
      rightCopyId,
      createSyncConflictCopyMutationId(rightCopyId),
      rightSource.modifiedBy,
      rightSource.modifiedAt
    )

    expect(leftCopyId).toBe(rightCopyId)
    expect(leftCopy.contentHash).toBe(rightCopy.contentHash)
  })

  it('keeps an original tombstone and preserves the concurrent edit as a copy', () => {
    const base = createNote(
      '00000000-0000-4000-8000-000000000001',
      localDeviceId,
      {
        [columnAId]: 'base',
      }
    )
    const tombstone = createNote(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      {},
      null,
      timestamp
    )
    const edited = createNote(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      {
        [columnAId]: 'edited',
      }
    )

    const result = mergeSyncDocument(base, tombstone, edited)

    expect((result.document as SyncNoteDocument).deletedAt).toBe(timestamp)
    expect(result.conflicts[0]).toMatchObject({
      conflictType: SyncConflictTypeEnum.EditDelete,
      conflictCopyDocument: edited,
    })
  })

  it('handles create/create UUID collisions deterministically', () => {
    const local = createNote(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      {
        [columnAId]: 'local',
      }
    )
    const remote = createNote(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      {
        [columnAId]: 'remote',
      }
    )

    const left = mergeSyncDocument(null, local, remote)
    const right = mergeSyncDocument(null, remote, local)

    expect(left.document.contentHash).toBe(right.document.contentHash)
    expect(left.conflicts[0].conflictType).toBe(
      SyncConflictTypeEnum.UuidCollision
    )
    expect(left.conflicts[0].conflictCopyDocument).toBeDefined()
  })

  it('does not let a stale live note resurrect a retained tombstone', () => {
    const tombstone = createNote(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      {},
      null,
      timestamp
    )
    const stale = createNote(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      { [columnAId]: 'stale' }
    )

    const result = mergeSyncDocument(tombstone, tombstone, stale)

    expect((result.document as SyncNoteDocument).deletedAt).toBe(timestamp)
    expect(result.conflicts[0].conflictType).toBe(
      SyncConflictTypeEnum.EditDelete
    )
  })
  it('merges independent configuration scalars and converges concurrent ordering', () => {
    const base = createConfiguration(
      '00000000-0000-4000-8000-000000000001',
      localDeviceId
    )
    const local = createConfiguration(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      { columnATitle: 'Local title', columnAOrderKey: '00000001' }
    )
    const remote = createConfiguration(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      { truncationLength: 120, columnAOrderKey: '00000002' }
    )

    const left = mergeSyncDocument(base, local, remote)
    const right = mergeSyncDocument(base, remote, local)
    const merged = left.document as SyncConfigurationDocument

    expect(left.document.contentHash).toBe(right.document.contentHash)
    expect(merged.payload.columns[0].payload?.title).toBe('Local title')
    expect(merged.payload.generalSettings.payload?.textTruncationLength).toBe(
      120
    )
    expect(
      left.conflicts.some((conflict) =>
        conflict.fieldPaths.includes(
          `payload.columns.${columnAId}.payload.orderKey`
        )
      )
    ).toBe(true)
  })

  it('keeps a configuration tombstone when another device edits the entity', () => {
    const base = createConfiguration(
      '00000000-0000-4000-8000-000000000001',
      localDeviceId
    )
    const local = createConfiguration(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      { columnATitle: 'Edited title' }
    )
    const { contentHash: ignoredContentHash, ...baseDraft } = base
    void ignoredContentHash
    const remote = mapSyncDocument({
      ...baseDraft,
      mutationId: '00000000-0000-4000-8000-000000000003',
      modifiedBy: remoteDeviceId,
      payload: {
        ...base.payload,
        columns: base.payload.columns.map((column) => {
          if (column.id !== columnAId) {
            return column
          }

          return {
            ...column,
            payload: null,
            deletedAt: timestamp,
            mutationId: '00000000-0000-4000-8000-000000000003',
            modifiedBy: remoteDeviceId,
          }
        }),
      },
    }).document as SyncConfigurationDocument

    const result = mergeSyncDocument(base, local, remote)
    const merged = result.document as SyncConfigurationDocument

    expect(
      merged.payload.columns.find((column) => column.id === columnAId)?.payload
    ).toBeNull()
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        conflictType: SyncConflictTypeEnum.EditDelete,
        fieldPaths: [`payload.columns.${columnAId}`],
      }),
    ])
  })
  it('rejects an invalid merged configuration graph without committing it', () => {
    const base = createConfiguration(
      '00000000-0000-4000-8000-000000000001',
      localDeviceId
    )
    const local = createConfiguration(
      '00000000-0000-4000-8000-000000000002',
      localDeviceId,
      { columnATitle: 'Local title' }
    )
    const remote = createConfiguration(
      '00000000-0000-4000-8000-000000000003',
      remoteDeviceId,
      { columnANoteTypeId: '99999999-9999-4999-8999-999999999999' }
    )

    const result = mergeSyncDocument(base, local, remote)

    expect(
      result.conflicts.some(
        (conflict) =>
          conflict.conflictType === SyncConflictTypeEnum.InvalidReference
      )
    ).toBe(true)
    expect(
      (result.document as SyncConfigurationDocument).payload.columns[0].payload
        ?.noteTypeId
    ).toBe(noteTypeId)
  })
})
