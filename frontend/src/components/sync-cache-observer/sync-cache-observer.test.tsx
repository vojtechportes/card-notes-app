import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { syncQueryKeys } from '../../constants/sync-query-keys'
import { notesQueryKeys } from '../../pages/notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../../pages/settings-page/constants/settings-query-keys'
import type { SyncStatusDto } from '../../types/api'
import { SyncCacheObserver } from './sync-cache-observer'

vi.mock('../../api/sync/requests', () => ({
  getSyncStatus: vi.fn(() => new Promise(() => undefined)),
}))

const createStatus = (dataRevision: number): SyncStatusDto => ({
  dataRevision,
  isEnabled: true,
  isStartupReady: true,
  pendingMutationCount: 0,
  state: 'synced',
  unresolvedConflictCount: 0,
})

describe(SyncCacheObserver.name, () => {
  it('invalidates cached domain data when a background run changes revision', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    queryClient.setQueryData(syncQueryKeys.status(), createStatus(1))
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <SyncCacheObserver />
      </QueryClientProvider>
    )

    act(() => {
      queryClient.setQueryData(syncQueryKeys.status(), createStatus(2))
    })

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: notesQueryKeys.all(),
      })
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: settingsQueryKeys.all(),
      })
    })
  })
})
