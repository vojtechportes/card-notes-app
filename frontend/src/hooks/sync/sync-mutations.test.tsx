import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runSyncNow, resolveSyncConflict } from '../../api/sync/requests'
import { syncQueryKeys } from '../../constants/sync-query-keys'
import { notesQueryKeys } from '../../pages/notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../../pages/settings-page/constants/settings-query-keys'
import type { SyncConflictDto, SyncStatusDto } from '../../types/api'
import { useResolveSyncConflictMutation } from './use-resolve-sync-conflict-mutation'
import { useRunSyncNowMutation } from './use-run-sync-now-mutation'

vi.mock('../../api/sync/requests', () => ({
  resolveSyncConflict: vi.fn(),
  runSyncNow: vi.fn(),
}))

const createResponse = <TData,>(data: TData): AxiosResponse<TData> => ({
  config: {} as AxiosResponse<TData>['config'],
  data,
  headers: {},
  status: 200,
  statusText: 'OK',
})

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('synchronization mutation hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates synchronization, notes, and settings after manual sync', async () => {
    vi.mocked(runSyncNow).mockResolvedValue(
      createResponse({ state: 'synced' } as SyncStatusDto)
    )
    const queryClient = createQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRunSyncNowMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(() => result.current.mutateAsync())

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: syncQueryKeys.all(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.all(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.all(),
    })
  })

  it('invalidates synchronized data after conflict resolution', async () => {
    vi.mocked(resolveSyncConflict).mockResolvedValue(
      createResponse({ id: 'conflict-1' } as SyncConflictDto)
    )
    const queryClient = createQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useResolveSyncConflictMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(() =>
      result.current.mutateAsync({
        id: 'conflict-1',
        resolution: { resolutionState: 'resolved-local' },
      })
    )

    expect(resolveSyncConflict).toHaveBeenCalledWith('conflict-1', {
      resolutionState: 'resolved-local',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: syncQueryKeys.all(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.all(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.all(),
    })
  })
})
