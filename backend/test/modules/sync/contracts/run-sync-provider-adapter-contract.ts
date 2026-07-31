import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { SyncEntityKindEnum } from '../../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncProviderErrorKindEnum } from '../../../../src/modules/sync/types/sync-provider-error-kind-enum'
import type { SyncProviderAdapterContractDriver } from './sync-provider-adapter-contract-driver'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const hash = 'a'.repeat(64)
const firstDocument = JSON.stringify({ contentHash: hash, value: 'first' })
const secondDocument = JSON.stringify({ contentHash: hash, value: 'second' })

export const runSyncProviderAdapterContract = (
  createDriver: () => SyncProviderAdapterContractDriver
): void => {
  describe('SyncProviderAdapter contract', () => {
    it('discovers and creates workspaces idempotently', async () => {
      const { adapter } = createDriver()
      expect(await adapter.discoverWorkspace(workspaceId)).toBeNull()
      expect(await adapter.createWorkspace(workspaceId)).toMatchObject({
        providerWorkspaceId: workspaceId,
      })
      expect(await adapter.createWorkspace(workspaceId)).toEqual(
        await adapter.discoverWorkspace(workspaceId)
      )
    })

    it('paginates enumeration and incremental changes with cursor validation', async () => {
      const driver = createDriver()
      const { adapter } = driver
      await adapter.createDocument(
        'config.json',
        SyncEntityKindEnum.Configuration,
        firstDocument
      )
      await adapter.createDocument(
        'notes/1.json',
        SyncEntityKindEnum.Note,
        firstDocument
      )

      const first = await adapter.enumerateObjects()
      const second = await adapter.enumerateObjects(first.nextPageToken!)
      expect(first.objects).toHaveLength(1)
      expect(second.objects).toHaveLength(1)
      const empty = await adapter.listChanges(second.candidateCursor)
      expect(empty.changes).toEqual([])

      await adapter.createDocument(
        'notes/2.json',
        SyncEntityKindEnum.Note,
        firstDocument
      )
      expect(
        (await adapter.listChanges(second.candidateCursor)).changes
      ).toHaveLength(1)

      await driver.expireCursor(second.candidateCursor)
      await expect(
        adapter.listChanges(second.candidateCursor)
      ).rejects.toMatchObject({
        kind: SyncProviderErrorKindEnum.InvalidCursor,
      })
    })

    it('enforces conditional JSON writes and preserves identity and versions', async () => {
      const { adapter } = createDriver()
      const created = await adapter.createDocument(
        'config.json',
        SyncEntityKindEnum.Configuration,
        firstDocument
      )
      await expect(
        adapter.createDocument(
          'config.json',
          SyncEntityKindEnum.Configuration,
          firstDocument
        )
      ).rejects.toMatchObject({
        kind: SyncProviderErrorKindEnum.PreconditionFailed,
      })
      await expect(
        adapter.updateDocument(
          'config.json',
          SyncEntityKindEnum.Configuration,
          secondDocument,
          'stale'
        )
      ).rejects.toMatchObject({
        kind: SyncProviderErrorKindEnum.PreconditionFailed,
      })

      const updated = await adapter.updateDocument(
        'config.json',
        SyncEntityKindEnum.Configuration,
        secondDocument,
        created.providerVersion
      )
      const read = await adapter.readObject('config.json')
      expect(read.providerObjectId).toBe(created.providerObjectId)
      expect(read.providerVersion).toBe(updated.providerVersion)
    })

    it('creates immutable assets idempotently and validates their hashes', async () => {
      const { adapter } = createDriver()
      const bytes = Buffer.from('asset')
      await expect(
        adapter.createAsset(`assets/${hash}.png`, bytes, hash)
      ).rejects.toMatchObject({ kind: SyncProviderErrorKindEnum.Permanent })

      const validHash = createHash('sha256').update(bytes).digest('hex')
      const first = await adapter.createAsset(
        `assets/${validHash}.png`,
        bytes,
        validHash
      )
      const repeated = await adapter.createAsset(
        `assets/${validHash}.png`,
        bytes,
        validHash
      )
      expect(repeated).toEqual(first)
    })
  })
}
