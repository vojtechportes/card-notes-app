import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SyncStatusDto } from '../../types/api'
import '../../i18n'
import { SyncAppBarControl } from './sync-app-bar-control'

let status: SyncStatusDto
const mutate = vi.fn()

vi.mock('../../hooks/sync/use-sync-status-query', () => ({
  useSyncStatusQuery: () => ({ data: status }),
}))

vi.mock('../../hooks/sync/use-run-sync-now-mutation', () => ({
  useRunSyncNowMutation: () => ({ isPending: false, mutate }),
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

describe('SyncAppBarControl', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('stays out of the app bar while synchronization is disabled', () => {
    status = createStatus()

    render(<SyncAppBarControl />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps a persistent offline label after startup Work offline is chosen', () => {
    sessionStorage.setItem('notestack-work-offline', 'true')
    status = createStatus({
      state: 'connecting',
      isEnabled: true,
    })

    render(<SyncAppBarControl />)

    expect(
      screen.getByRole('button', {
        name: 'Synchronization: offline. Synchronize now',
      })
    ).toBeTruthy()
  })
  it.each([
    ['syncing', 'syncing', true],
    ['synced', 'synced', false],
    ['attention-required', 'attention required', false],
    ['error', 'error', false],
  ] as const)(
    'announces the %s state and applies the expected action availability',
    (state, label, disabled) => {
      status = createStatus({ state, isEnabled: true })

      render(<SyncAppBarControl />)

      expect(
        screen.getByRole('button', {
          name: `Synchronization: ${label}. Synchronize now`,
        })
      ).toHaveProperty('disabled', disabled)
    }
  )

  it('provides an accessible manual action with pending status when enabled', () => {
    status = createStatus({
      state: 'offline',
      isEnabled: true,
      pendingMutationCount: 4,
    })

    render(<SyncAppBarControl />)
    const button = screen.getByRole('button', {
      name: 'Synchronization: offline. Synchronize now',
    })

    fireEvent.click(button)

    expect(mutate).toHaveBeenCalledOnce()
    expect(screen.getByText('4')).toBeTruthy()
  })
})
