import { describe, expect, it } from 'vitest'
import { FakeSyncProviderAdapter } from '../../../src/modules/sync/fake-provider/fake-sync-provider.adapter'
import { SyncProviderError } from '../../../src/modules/sync/types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../../src/modules/sync/types/sync-provider-error-kind-enum'
import { runSyncProviderAdapterContract } from './contracts/run-sync-provider-adapter-contract'

runSyncProviderAdapterContract(() => {
  const adapter = new FakeSyncProviderAdapter({ pageSize: 1 })
  return {
    adapter,
    expireCursor: (cursor: string) => {
      adapter.invalidateCursorsBefore(Number(cursor) + 1)
    },
  }
})

describe('FakeSyncProviderAdapter error injection', () => {
  it('normalizes queued failures and retains retry timing', async () => {
    const adapter = new FakeSyncProviderAdapter()
    adapter.queueFailure(
      'list-changes',
      new SyncProviderError(
        SyncProviderErrorKindEnum.Throttled,
        'Slow down',
        12_000
      )
    )

    await expect(adapter.listChanges('0')).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.Throttled,
      retryAfterMs: 12_000,
    })
  })
})
