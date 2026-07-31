import { describe, expect, it } from 'vitest'
import { SyncEntityKindEnum } from '../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncMutationIntentEnum } from '../../../src/modules/sync/types/sync-mutation-intent-enum'
import { generateNotificationAuthKey } from '../../../src/modules/sync/utils/generate-notification-auth-key.util'
import { isAssetReferenceValid } from '../../../src/modules/sync/utils/is-asset-reference-valid.util'
import { isNotificationAuthKeyValid } from '../../../src/modules/sync/utils/is-notification-auth-key-valid.util'
import { isSyncConfigurationDocumentValid } from '../../../src/modules/sync/utils/is-sync-configuration-document-valid.util'
import { isSyncMutationValid } from '../../../src/modules/sync/utils/is-sync-mutation-valid.util'
import { isSyncNoteDocumentValid } from '../../../src/modules/sync/utils/is-sync-note-document-valid.util'
import { isSyncTombstoneValid } from '../../../src/modules/sync/utils/is-sync-tombstone-valid.util'
import { isWorkspaceDocumentValid } from '../../../src/modules/sync/utils/is-workspace-document-valid.util'
import { redactNotificationAuthKey } from '../../../src/modules/sync/utils/redact-notification-auth-key.util'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const deviceId = '22222222-2222-4222-8222-222222222222'
const mutationId = '33333333-3333-4333-8333-333333333333'
const entityId = '44444444-4444-4444-8444-444444444444'
const noteTypeId = '55555555-5555-4555-8555-555555555555'
const hash = 'a'.repeat(64)
const modifiedAt = '2026-07-31T12:00:00.000Z'

const metadata = {
  formatVersion: 1,
  workspaceId,
  contentHash: hash,
  parentHash: null,
  mutationId,
  modifiedBy: deviceId,
  modifiedAt,
}

describe('workspace synchronization contract', () => {
  it('accepts v1 workspace documents and ignores safe unknown properties', () => {
    const document = {
      formatVersion: 1,
      workspaceId,
      createdAt: modifiedAt,
      createdByDeviceId: deviceId,
      notificationRouting: {
        workspaceRouteId: 'opaque-route-id-123456',
        notificationAuthKey: generateNotificationAuthKey(),
        secretVersion: 1,
      },
      futureField: 'ignored-by-v1-reader',
    }

    expect(isWorkspaceDocumentValid(document)).toBe(true)
    expect(isWorkspaceDocumentValid({ ...document, formatVersion: 2 })).toBe(
      false
    )
    expect(
      isWorkspaceDocumentValid({ ...document, workspaceId: 'not-a-uuid' })
    ).toBe(false)
    expect(
      isWorkspaceDocumentValid({ ...document, createdAt: 'yesterday' })
    ).toBe(false)
  })

  it('generates canonical 32-byte keys and rejects invalid encodings', () => {
    const key = generateNotificationAuthKey()

    expect(Buffer.from(key, 'base64url')).toHaveLength(32)
    expect(key).not.toContain('=')
    expect(isNotificationAuthKeyValid(key)).toBe(true)
    expect(
      isNotificationAuthKeyValid(Buffer.alloc(31).toString('base64url'))
    ).toBe(false)
    expect(
      isNotificationAuthKeyValid(Buffer.alloc(33).toString('base64url'))
    ).toBe(false)
    expect(isNotificationAuthKeyValid(`${key}=`)).toBe(false)
    expect(isNotificationAuthKeyValid('illegal+key/value')).toBe(false)
    expect(redactNotificationAuthKey(key)).toBe('[REDACTED]')
    expect(redactNotificationAuthKey(key)).not.toContain(key)
  })
})

describe('synchronization document contracts', () => {
  it('validates live and tombstoned note documents without timestamp conflict logic', () => {
    const asset = {
      assetId: hash,
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 123,
      width: 10,
      height: 20,
    }
    const document = {
      ...metadata,
      entityType: 'note',
      entityId,
      deletedAt: null,
      payload: {
        noteTypeId,
        background: null,
        values: { title: 'Note', picture: asset },
      },
    }

    expect(isAssetReferenceValid(asset)).toBe(true)
    expect(isAssetReferenceValid({ ...asset, assetId: 'A'.repeat(64) })).toBe(
      false
    )
    expect(isAssetReferenceValid({ ...asset, fileName: '../photo.png' })).toBe(
      false
    )
    expect(isAssetReferenceValid({ ...asset, size: -1 })).toBe(false)
    expect(isSyncNoteDocumentValid(document)).toBe(true)
    expect(
      isSyncNoteDocumentValid({
        ...document,
        payload: { ...document.payload, background: 'PURPLE' },
      })
    ).toBe(false)
    expect(
      isSyncNoteDocumentValid({
        ...document,
        payload: {
          ...document.payload,
          values: { mixed: ['label', asset] },
        },
      })
    ).toBe(false)
    expect(
      isSyncNoteDocumentValid({ ...document, contentHash: 'not-a-hash' })
    ).toBe(false)
    expect(
      isSyncNoteDocumentValid({
        ...document,
        deletedAt: modifiedAt,
        payload: null,
      })
    ).toBe(true)
    expect(
      isSyncNoteDocumentValid({ ...document, deletedAt: modifiedAt })
    ).toBe(false)
  })

  it('validates the complete configuration graph and entity tombstones', () => {
    const configurationEntityMetadata = {
      id: entityId,
      mutationId,
      modifiedBy: deviceId,
      modifiedAt,
      deletedAt: null,
    }
    const document = {
      ...metadata,
      entityType: 'configuration',
      entityId: 'configuration',
      payload: {
        noteTypes: [
          {
            ...configurationEntityMetadata,
            payload: { title: 'Default', orderKey: 'a' },
          },
        ],
        columns: [
          {
            ...configurationEntityMetadata,
            id: '66666666-6666-4666-8666-666666666666',
            payload: {
              noteTypeId,
              name: 'title',
              title: 'Title',
              type: 'text',
              orderKey: 'a',
              isHidden: false,
              isHiddenInDetail: false,
              isDefault: false,
              config: null,
            },
          },
        ],
        labels: [],
        generalSettings: {
          ...configurationEntityMetadata,
          id: '77777777-7777-4777-8777-777777777777',
          payload: {
            textTruncationLength: null,
            cardFieldDisplayCount: 4,
            mergeDateTimeFields: false,
          },
        },
      },
    }

    expect(isSyncConfigurationDocumentValid(document)).toBe(true)
    expect(
      isSyncConfigurationDocumentValid({
        ...document,
        payload: { ...document.payload, columns: 'invalid' },
      })
    ).toBe(false)
    expect(
      isSyncConfigurationDocumentValid({
        ...document,
        payload: {
          ...document.payload,
          noteTypes: [
            {
              ...configurationEntityMetadata,
              deletedAt: modifiedAt,
              payload: null,
            },
          ],
        },
      })
    ).toBe(true)
  })

  it('validates mutation authority and tombstone deletion metadata', () => {
    const mutation = {
      mutationId,
      workspaceId,
      entityKind: SyncEntityKindEnum.Note,
      entityId,
      intent: SyncMutationIntentEnum.Upsert,
      baseHash: null,
      targetHash: hash,
      originatingDeviceId: deviceId,
      createdAt: modifiedAt,
    }
    const tombstone = {
      workspaceId,
      entityKind: SyncEntityKindEnum.Note,
      entityId,
      deletionMutationId: mutationId,
      deletionDeviceId: deviceId,
      deletedAt: modifiedAt,
    }

    expect(isSyncMutationValid(mutation)).toBe(true)
    expect(isSyncMutationValid({ ...mutation, targetHash: 'bad' })).toBe(false)
    expect(isSyncTombstoneValid(tombstone)).toBe(true)
    expect(
      isSyncTombstoneValid({ ...tombstone, deletionDeviceId: 'bad' })
    ).toBe(false)
  })
})
