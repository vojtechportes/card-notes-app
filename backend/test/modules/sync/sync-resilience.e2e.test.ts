import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { v4 as uuidV4 } from 'uuid'
import { syncLogicalKeys } from '../../../src/modules/sync/constants/sync-logical-keys'
import { FakeSyncProviderAdapter } from '../../../src/modules/sync/fake-provider/fake-sync-provider.adapter'
import { SyncProviderError } from '../../../src/modules/sync/types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../../src/modules/sync/types/sync-provider-error-kind-enum'
import { SyncTestDevice } from './resilience/sync-test-device'

const timestamp = '2026-08-04T10:00:00.000Z'

describe('two-device synchronization resilience', () => {
  const devices: SyncTestDevice[] = []

  afterEach(() => {
    for (const device of devices) {
      device.dispose()
    }
  })

  it('converges after lost wake-ups, a long offline delete/edit race, and an expired cursor', async () => {
    const provider = new FakeSyncProviderAdapter({ pageSize: 1 })
    const deviceA = new SyncTestDevice()
    devices.push(deviceA)
    provider.seedWorkspace(deviceA.workspaceId)

    deviceA.generalSettings.setValue('textTruncationLength', 120)
    await deviceA.synchronize(provider)

    const deviceB = new SyncTestDevice(deviceA)
    devices.push(deviceB)

    expect(
      deviceB.generalSettings.findValue<number | null>('textTruncationLength')
    ).toBe(
      deviceA.generalSettings.findValue<number | null>('textTruncationLength')
    )

    const noteId = uuidV4()
    deviceA.notes.create(noteId, deviceA.defaultNoteTypeId, {}, timestamp)
    await deviceA.synchronize(provider)

    deviceA.notes.updateBackground(noteId, 'LEMON', '2026-08-04T11:00:00.000Z')
    await deviceA.synchronize(provider)

    await deviceB.synchronize(provider)
    expect(deviceB.notes.findById(noteId)?.background).toBe('LEMON')

    deviceA.notes.delete(noteId, '2026-08-04T12:00:00.000Z')
    deviceB.notes.updateBackground(noteId, 'CREAM', '2026-08-04T12:30:00.000Z')
    await deviceA.synchronize(provider)
    await deviceB.synchronize(provider)
    await deviceA.synchronize(provider)

    expect(deviceA.notes.findById(noteId)).toBeUndefined()
    expect(deviceB.notes.findById(noteId)).toBeUndefined()
    expect(deviceB.conflicts.listUnresolved(deviceB.workspaceId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'edit-delete',
          entityId: noteId,
        }),
      ])
    )

    provider.invalidateCursorsBefore(Number.MAX_SAFE_INTEGER)
    deviceA.reconciliation.invalidateCursor(
      deviceA.reconciliation.getActiveContext()!,
      'long-offline-rescan'
    )
    await deviceA.synchronize(provider)

    const liveNotesA = deviceA.database
      .getConnection()
      .prepare('SELECT id FROM notes WHERE deleted_at IS NULL ORDER BY id')
      .all()
    const liveNotesB = deviceB.database
      .getConnection()
      .prepare('SELECT id FROM notes WHERE deleted_at IS NULL ORDER BY id')
      .all()

    expect(liveNotesA).toEqual(liveNotesB)
  })

  it('retains pending work through throttling and transfers a large verified asset', async () => {
    const provider = new FakeSyncProviderAdapter()
    const deviceA = new SyncTestDevice()
    devices.push(deviceA)
    provider.seedWorkspace(deviceA.workspaceId)

    const deviceB = new SyncTestDevice(deviceA)
    devices.push(deviceB)

    const pngHeader = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
      'base64'
    )
    const largeImage = Buffer.concat([
      pngHeader,
      Buffer.alloc(2 * 1024 * 1024, 7),
    ])
    const asset = deviceA.assetsService.storeImage(largeImage, {
      fileName: 'large-resilience-image.png',
    })

    provider.queueFailure(
      'enumerate',
      new SyncProviderError(
        SyncProviderErrorKindEnum.Throttled,
        'Verification throttle',
        1
      )
    )

    await expect(deviceA.synchronize(provider)).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.Throttled,
    })
    expect(deviceA.outbox.findAll()).toEqual([
      expect.objectContaining({ entityId: asset.assetId, status: 'pending' }),
    ])

    await deviceA.synchronize(provider, new Date(Date.now() + 2_000))
    await deviceB.synchronize(provider)

    const downloaded = deviceB.assetsService.readAsset(asset.assetId).buffer
    expect(downloaded.length).toBe(largeImage.length)
    expect(createHash('sha256').update(downloaded).digest('hex')).toBe(
      createHash('sha256').update(largeImage).digest('hex')
    )
    expect(
      provider.getObject(syncLogicalKeys.asset(asset.assetId, 'png'))
    ).toBeDefined()
  })
})
