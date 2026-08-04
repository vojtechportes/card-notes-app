import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SyncStatusDto } from '../../types/api'
import '../../i18n'
import { SyncStartupGate } from './sync-startup-gate'

let status: SyncStatusDto | undefined
const refetch = vi.fn()
const mutateAsync = vi.fn(() => Promise.resolve())

vi.mock('../../hooks/sync/use-sync-status-query', () => ({
  useSyncStatusQuery: () => ({ data: status, isError: false, refetch }),
}))

vi.mock('../../hooks/sync/use-run-sync-now-mutation', () => ({
  useRunSyncNowMutation: () => ({ isPending: false, mutateAsync }),
}))

vi.mock('../sync-cache-observer/sync-cache-observer', () => ({
  SyncCacheObserver: () => null,
}))

const createStatus = (
  overrides: Partial<SyncStatusDto> = {}
): SyncStatusDto => ({
  state: 'disabled',
  isEnabled: false,
  provider: null,
  accountId: null,
  accountDisplayName: null,
  workspaceId: null,
  workspaceDisplayName: null,
  pendingMutationCount: 0,
  unresolvedConflictCount: 0,
  lastAttemptedAt: null,
  lastSucceededAt: null,
  lastErrorClassification: null,
  lastTrigger: null,
  isStartupReady: true,
  dataRevision: 0,
  ...overrides,
})

describe('SyncStartupGate', () => {
  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('mounts local pages immediately while synchronization is disabled', () => {
    status = createStatus()

    render(
      <SyncStartupGate>
        <div>Local notes</div>
      </SyncStartupGate>
    )

    expect(screen.getByText('Local notes')).toBeTruthy()
  })

  it('blocks pages until configured startup reconciliation is ready', () => {
    status = createStatus({
      state: 'syncing',
      isEnabled: true,
      isStartupReady: false,
    })

    render(
      <SyncStartupGate>
        <div>Local notes</div>
      </SyncStartupGate>
    )

    expect(screen.getByText('Synchronizing your notes')).toBeTruthy()
    expect(screen.queryByText('Local notes')).toBeNull()
  })

  it('offers retry and Work offline after the bounded wait', () => {
    vi.useFakeTimers()
    status = createStatus({
      state: 'syncing',
      isEnabled: true,
      isStartupReady: false,
      pendingMutationCount: 2,
    })

    render(
      <SyncStartupGate>
        <div>Local notes</div>
      </SyncStartupGate>
    )

    act(() => vi.advanceTimersByTime(5_000))
    fireEvent.click(screen.getByRole('button', { name: 'Work offline' }))

    expect(screen.getByText('Local notes')).toBeTruthy()
    expect(sessionStorage.getItem('notestack-work-offline')).toBe('true')
  })
})
