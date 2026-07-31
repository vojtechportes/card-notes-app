import { describe, expect, it } from 'vitest'
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum'
import type { SyncColumnPayload } from '../../../src/modules/sync/types/sync-column-payload'
import type { SyncNoteValue } from '../../../src/modules/sync/types/sync-note-value'
import { syncLogicalKeys } from '../../../src/modules/sync/constants/sync-logical-keys'
import type { SyncConfigurationDocument } from '../../../src/modules/sync/types/sync-configuration-document'
import type { SyncNoteDocument } from '../../../src/modules/sync/types/sync-note-document'
import { SyncDocumentQuarantineReasonEnum } from '../../../src/modules/sync/types/sync-document-quarantine-reason-enum'
import { generateNotificationAuthKey } from '../../../src/modules/sync/utils/generate-notification-auth-key.util'
import { mapSyncAssetReference } from '../../../src/modules/sync/utils/map-sync-asset-reference.util'
import { mapSyncDocument } from '../../../src/modules/sync/utils/map-sync-document.util'
import { parseRemoteSyncDocument } from '../../../src/modules/sync/utils/parse-remote-sync-document.util'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const deviceId = '22222222-2222-4222-8222-222222222222'
const mutationId = '33333333-3333-4333-8333-333333333333'
const noteId = '44444444-4444-4444-8444-444444444444'
const noteTypeId = '55555555-5555-4555-8555-555555555555'
const secondaryNoteTypeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const columnId = '66666666-6666-4666-8666-666666666666'
const secondaryColumnId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const settingsId = '77777777-7777-4777-8777-777777777777'
const labelId = '88888888-8888-4888-8888-888888888888'
const secondaryLabelId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const parentHash = 'b'.repeat(64)
const modifiedAt = '2026-07-31T12:00:00.000Z'

const metadata = {
  formatVersion: 1 as const,
  workspaceId,
  parentHash,
  mutationId,
  modifiedBy: deviceId,
  modifiedAt,
}

const createNoteDraft = (): Omit<SyncNoteDocument, 'contentHash'> => ({
  ...metadata,
  entityType: 'note',
  entityId: noteId,
  deletedAt: null,
  payload: {
    noteTypeId,
    background: null,
    values: {
      [columnId]: 'A note',
      gallery: [
        {
          assetId: 'a'.repeat(64),
          fileName: 'first.png',
          mimeType: 'image/png',
          size: 10,
        },
        {
          assetId: 'c'.repeat(64),
          fileName: 'second.png',
          mimeType: 'image/png',
          size: 20,
        },
      ],
    },
  },
})

const createConfigurationDraft = (
  reverse = false
): Omit<SyncConfigurationDocument, 'contentHash'> => {
  const noteType = {
    id: noteTypeId,
    mutationId,
    modifiedBy: deviceId,
    modifiedAt,
    deletedAt: null,
    payload: { title: 'Default', orderKey: '0001' },
  }
  const secondaryNoteType = {
    ...noteType,
    id: secondaryNoteTypeId,
    payload: { title: 'Secondary', orderKey: '0002' },
  }
  const column = {
    id: columnId,
    mutationId,
    modifiedBy: deviceId,
    modifiedAt,
    deletedAt: null,
    payload: {
      noteTypeId,
      name: 'title',
      title: 'Title',
      type: 'text' as const,
      orderKey: '0002',
      isHidden: false,
      isHiddenInDetail: false,
      isDefault: false,
      config: null,
    },
  }
  const secondaryColumn = {
    ...column,
    id: secondaryColumnId,
    payload: {
      ...column.payload,
      noteTypeId: secondaryNoteTypeId,
      name: 'secondary-title',
      orderKey: '0001',
    },
  }
  const label = {
    id: labelId,
    mutationId,
    modifiedBy: deviceId,
    modifiedAt,
    deletedAt: null,
    payload: {
      title: 'Important',
      name: 'important',
      color: '#ff0000',
      noteTypeId,
    },
  }
  const secondaryLabel = {
    ...label,
    id: secondaryLabelId,
    payload: {
      ...label.payload,
      name: 'secondary-important',
      noteTypeId: secondaryNoteTypeId,
    },
  }
  const noteTypes = reverse
    ? [noteType, secondaryNoteType].reverse()
    : [noteType, secondaryNoteType]
  const columns = reverse
    ? [column, secondaryColumn].reverse()
    : [column, secondaryColumn]
  const labels = reverse
    ? [label, secondaryLabel].reverse()
    : [label, secondaryLabel]

  return {
    ...metadata,
    entityType: 'configuration',
    entityId: 'configuration',
    payload: {
      noteTypes,
      columns,
      labels,
      generalSettings: {
        id: settingsId,
        mutationId,
        modifiedBy: deviceId,
        modifiedAt,
        deletedAt: null,
        payload: {
          textTruncationLength: 100,
          cardFieldDisplayCount: 4,
          mergeDateTimeFields: false,
        },
      },
    },
  }
}

const expectQuarantineReason = (
  result: ReturnType<typeof parseRemoteSyncDocument>,
  reason: SyncDocumentQuarantineReasonEnum
): void => {
  expect(result).toEqual({ status: 'quarantined', reason })
}

describe('canonical synchronization document mapping', () => {
  it('maps workspace, note, and configuration documents to provider-neutral keys', () => {
    const workspace = mapSyncDocument({
      formatVersion: 1,
      workspaceId,
      createdAt: modifiedAt,
      createdByDeviceId: deviceId,
      notificationRouting: {
        workspaceRouteId: 'opaque-route-id-123456',
        notificationAuthKey: generateNotificationAuthKey(),
        secretVersion: 1,
      },
    })
    const note = mapSyncDocument(createNoteDraft())
    const configuration = mapSyncDocument(createConfigurationDraft())

    expect(workspace.logicalKey).toBe(syncLogicalKeys.workspace)
    expect(note.logicalKey).toBe(syncLogicalKeys.note(noteId))
    expect(configuration.logicalKey).toBe(syncLogicalKeys.configuration)
    expect(note.document).toMatchObject({
      contentHash: note.contentHash,
      parentHash,
      mutationId,
      modifiedBy: deviceId,
    })
  })

  it('is deterministic across object and configuration entity ordering while preserving note array order', () => {
    const forward = createConfigurationDraft()
    const reverse = createConfigurationDraft(true)
    const first = mapSyncDocument(forward)
    const second = mapSyncDocument(reverse)
    const note = mapSyncDocument(createNoteDraft())

    expect(first.canonicalJson).toBe(second.canonicalJson)
    expect(first.contentHash).toBe(second.contentHash)
    expect((note.document as SyncNoteDocument).payload?.values.gallery).toEqual(
      createNoteDraft().payload?.values.gallery
    )
  })

  it('changes its hash for ancestry and mutation authority but not for a declared content hash', () => {
    const first = mapSyncDocument(createNoteDraft())
    const changedParent = mapSyncDocument({
      ...createNoteDraft(),
      parentHash: 'd'.repeat(64),
    })
    const changedMutation = mapSyncDocument({
      ...createNoteDraft(),
      mutationId: '99999999-9999-4999-8999-999999999999',
    })
    const remapped = mapSyncDocument(first.document)

    expect(changedParent.contentHash).not.toBe(first.contentHash)
    expect(changedMutation.contentHash).not.toBe(first.contentHash)
    expect(remapped.contentHash).toBe(first.contentHash)
  })

  it('maps content-addressed assets and rejects unsafe extensions', () => {
    const reference = {
      assetId: 'a'.repeat(64),
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 10,
    }

    expect(mapSyncAssetReference(reference)).toEqual({
      logicalKey: `assets/${reference.assetId}.png`,
      contentHash: reference.assetId,
      reference,
    })
    expect(() =>
      mapSyncAssetReference({ ...reference, mimeType: 'image/svg+xml' })
    ).toThrow()
  })
})

describe('remote synchronization document parsing', () => {
  it('round-trips known fields and ignores safe unknown v1 fields', () => {
    const mapped = mapSyncDocument(createNoteDraft())
    const remote = {
      ...(mapped.document as SyncNoteDocument),
      futureEnvelopeField: true,
      payload: {
        ...(mapped.document as SyncNoteDocument).payload,
        futurePayloadField: 'ignored',
      },
    }
    const result = parseRemoteSyncDocument(
      mapped.logicalKey,
      JSON.stringify(remote),
      {
        expectedWorkspaceId: workspaceId,
        knownNoteTypeIds: new Set([noteTypeId]),
      }
    )

    expect(result.status).toBe('accepted')
    if (result.status === 'accepted') {
      expect(result.mappedDocument.canonicalJson).toBe(mapped.canonicalJson)
    }
  })

  it('returns distinct quarantines for unsupported versions, malformed JSON, and corruption', () => {
    const mapped = mapSyncDocument(createNoteDraft())
    const document = mapped.document as SyncNoteDocument

    expectQuarantineReason(
      parseRemoteSyncDocument(mapped.logicalKey, '{', {
        expectedWorkspaceId: workspaceId,
      }),
      SyncDocumentQuarantineReasonEnum.InvalidJson
    )
    expectQuarantineReason(
      parseRemoteSyncDocument(
        mapped.logicalKey,
        JSON.stringify({ ...document, formatVersion: 2 }),
        { expectedWorkspaceId: workspaceId }
      ),
      SyncDocumentQuarantineReasonEnum.UnsupportedFormatVersion
    )
    expectQuarantineReason(
      parseRemoteSyncDocument(
        mapped.logicalKey,
        JSON.stringify({ ...document, contentHash: 'e'.repeat(64) }),
        { expectedWorkspaceId: workspaceId }
      ),
      SyncDocumentQuarantineReasonEnum.ContentHashMismatch
    )
  })

  it('quarantines workspace, logical-key, note-type, and configuration relationship mismatches', () => {
    const note = mapSyncDocument(createNoteDraft())
    const configuration = mapSyncDocument(createConfigurationDraft())
    const danglingConfiguration = {
      ...(configuration.document as SyncConfigurationDocument),
      payload: {
        ...(configuration.document as SyncConfigurationDocument).payload,
        columns: [
          {
            ...(configuration.document as SyncConfigurationDocument).payload
              .columns[0],
            payload: {
              ...(configuration.document as SyncConfigurationDocument).payload
                .columns[0].payload!,
              noteTypeId: '99999999-9999-4999-8999-999999999999',
            },
          },
        ],
      },
    }
    const remappedDangling = mapSyncDocument(danglingConfiguration)

    expectQuarantineReason(
      parseRemoteSyncDocument(note.logicalKey, note.canonicalJson, {
        expectedWorkspaceId: '99999999-9999-4999-8999-999999999999',
      }),
      SyncDocumentQuarantineReasonEnum.WorkspaceMismatch
    )
    expectQuarantineReason(
      parseRemoteSyncDocument('notes/wrong.json', note.canonicalJson, {
        expectedWorkspaceId: workspaceId,
      }),
      SyncDocumentQuarantineReasonEnum.LogicalKeyMismatch
    )
    expectQuarantineReason(
      parseRemoteSyncDocument(note.logicalKey, note.canonicalJson, {
        expectedWorkspaceId: workspaceId,
        knownNoteTypeIds: new Set(),
      }),
      SyncDocumentQuarantineReasonEnum.InvalidRelationship
    )
    expectQuarantineReason(
      parseRemoteSyncDocument(
        remappedDangling.logicalKey,
        remappedDangling.canonicalJson,
        { expectedWorkspaceId: workspaceId }
      ),
      SyncDocumentQuarantineReasonEnum.InvalidRelationship
    )
  })

  it('quarantines values that do not match known column schemas', () => {
    const asset = {
      assetId: 'a'.repeat(64),
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 10,
    }
    const invalidCases: Array<{
      type: ColumnTypeEnum
      value: SyncNoteValue
      config: Record<string, unknown> | null
    }> = [
      { type: ColumnTypeEnum.Text, value: asset, config: null },
      { type: ColumnTypeEnum.Link, value: asset, config: null },
      { type: ColumnTypeEnum.Date, value: 'not-a-date', config: null },
      { type: ColumnTypeEnum.Number, value: '12', config: null },
      {
        type: ColumnTypeEnum.Labels,
        value: [labelId, labelId],
        config: { allowMultiple: true },
      },
      { type: ColumnTypeEnum.Image, value: 'C:\\photo.png', config: null },
    ]

    for (const invalidCase of invalidCases) {
      const mapped = mapSyncDocument({
        ...createNoteDraft(),
        payload: {
          ...createNoteDraft().payload!,
          values: { [columnId]: invalidCase.value },
        },
      })
      const column: SyncColumnPayload = {
        noteTypeId,
        name: 'field',
        title: 'Field',
        type: invalidCase.type,
        orderKey: '0001',
        isHidden: false,
        isHiddenInDetail: false,
        isDefault: false,
        config: invalidCase.config,
      }

      expectQuarantineReason(
        parseRemoteSyncDocument(mapped.logicalKey, mapped.canonicalJson, {
          expectedWorkspaceId: workspaceId,
          knownNoteTypeIds: new Set([noteTypeId]),
          columnsById: new Map([[columnId, column]]),
          knownLabelIds: new Set([labelId]),
        }),
        SyncDocumentQuarantineReasonEnum.InvalidRelationship
      )
    }
  })
  it('preserves structurally valid values whose column definition was removed', () => {
    const mapped = mapSyncDocument(createNoteDraft())
    const result = parseRemoteSyncDocument(
      mapped.logicalKey,
      mapped.canonicalJson,
      {
        expectedWorkspaceId: workspaceId,
        knownNoteTypeIds: new Set([noteTypeId]),
        columnsById: new Map(),
      }
    )

    expect(result.status).toBe('accepted')
  })

  it('quarantines image references with unsupported MIME types', () => {
    const mapped = mapSyncDocument({
      ...createNoteDraft(),
      payload: {
        ...createNoteDraft().payload!,
        values: {
          [columnId]: {
            assetId: 'a'.repeat(64),
            fileName: 'vector.svg',
            mimeType: 'image/svg+xml',
            size: 10,
          },
        },
      },
    })
    const imageColumn: SyncColumnPayload = {
      noteTypeId,
      name: 'image',
      title: 'Image',
      type: ColumnTypeEnum.Image,
      orderKey: '0001',
      isHidden: false,
      isHiddenInDetail: false,
      isDefault: false,
      config: null,
    }

    expectQuarantineReason(
      parseRemoteSyncDocument(mapped.logicalKey, mapped.canonicalJson, {
        expectedWorkspaceId: workspaceId,
        columnsById: new Map([[columnId, imageColumn]]),
      }),
      SyncDocumentQuarantineReasonEnum.InvalidRelationship
    )
  })
  it('round-trips tombstones and rejects embedded or incomplete image data', () => {
    const tombstone = mapSyncDocument({
      ...createNoteDraft(),
      deletedAt: modifiedAt,
      payload: null,
    })
    const incomplete = {
      ...(tombstone.document as SyncNoteDocument),
      payload: createNoteDraft().payload,
    }
    const embedded = mapSyncDocument({
      ...createNoteDraft(),
      payload: {
        ...createNoteDraft().payload!,
        values: { [columnId]: 'data:image/png;base64,AAAA' },
      },
    })

    expect(
      parseRemoteSyncDocument(tombstone.logicalKey, tombstone.canonicalJson, {
        expectedWorkspaceId: workspaceId,
      }).status
    ).toBe('accepted')
    expectQuarantineReason(
      parseRemoteSyncDocument(
        tombstone.logicalKey,
        JSON.stringify(incomplete),
        { expectedWorkspaceId: workspaceId }
      ),
      SyncDocumentQuarantineReasonEnum.InvalidDocument
    )
    expectQuarantineReason(
      parseRemoteSyncDocument(embedded.logicalKey, embedded.canonicalJson, {
        expectedWorkspaceId: workspaceId,
        columnsById: new Map([
          [
            columnId,
            {
              noteTypeId,
              name: 'image',
              title: 'Image',
              type: ColumnTypeEnum.Image,
              orderKey: '0001',
              isHidden: false,
              isHiddenInDetail: false,
              isDefault: false,
              config: null,
            },
          ],
        ]),
      }),
      SyncDocumentQuarantineReasonEnum.InvalidRelationship
    )
  })
})
