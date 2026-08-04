import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SyncStatusDto } from '../../../../types/api'
import '../../../../i18n'
import { SynchronizationSettingsPage } from './synchronization-settings-page'

const selectProvider = vi.fn()
const runCommand = vi.fn()
const beginEnable = vi.fn(() => {
  optInStarted = true
})
let optInStarted = false
let status: SyncStatusDto

vi.mock('../../../../hooks/sync/use-sync-status-query', () => ({
  useSyncStatusQuery: () => ({
    data: status,
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('../../../../hooks/sync/use-sync-provider-availability-query', () => ({
  useSyncProviderAvailabilityQuery: () => ({
    data: [
      { provider: 'google-drive', available: true },
      { provider: 'one-drive', available: true },
    ],
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('./use-synchronization-settings-controller', () => ({
  useSynchronizationSettingsController: () => ({
    actionError: false,
    beginEnable,
    busy: false,
    cancelPairing: vi.fn(),
    confirmPairing: vi.fn(),
    oauthAvailable: true,
    optInStarted,
    pairing: null,
    reconnect: vi.fn(),
    runCommand,
    runConfirmedCommand: vi.fn(),
    selectProvider,
    setShowProviderSelection: vi.fn(),
    showProviderSelection: false,
    syncNow: vi.fn(),
  }),
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

describe('SynchronizationSettingsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    optInStarted = false
  })

  it('starts disabled and does not begin OAuth until an available provider is selected', () => {
    status = createStatus()

    const { rerender } = render(<SynchronizationSettingsPage />)

    expect(screen.getByText(/Synchronization is off/)).toBeTruthy()
    expect(selectProvider).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Google Drive' })).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Enable synchronization' })
    )
    rerender(<SynchronizationSettingsPage />)

    const oneDriveButton = screen.getByRole('button', {
      name: 'Microsoft OneDrive',
    })

    expect(oneDriveButton).toHaveProperty('disabled', false)
    fireEvent.click(oneDriveButton)

    expect(beginEnable).toHaveBeenCalledOnce()
    expect(selectProvider).toHaveBeenCalledWith('one-drive')
  })

  it('offers resume without losing a retained provider binding', () => {
    status = createStatus({
      provider: 'google-drive',
      workspaceId: 'workspace-1',
      accountDisplayName: 'Ada',
      pendingMutationCount: 3,
    })

    render(<SynchronizationSettingsPage />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Resume synchronization' })
    )

    expect(screen.getByText('Pending local changes: 3')).toBeTruthy()
    expect(runCommand).toHaveBeenCalledWith('enable')
    expect(
      screen.queryByRole('button', { name: 'Repair synchronization' })
    ).toBeNull()
  })

  it.each([
    ['connecting', 'Connecting'],
    ['syncing', 'Synchronizing'],
    ['synced', 'Up to date'],
    ['offline', 'Working offline'],
    ['attention-required', 'Needs attention'],
    ['error', 'Error'],
  ] as const)('renders the %s status with enabled controls', (state, label) => {
    status = createStatus({
      state,
      isEnabled: true,
      provider: 'google-drive',
      workspaceId: 'workspace-1',
    })

    render(<SynchronizationSettingsPage />)

    expect(screen.getByText(label)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeTruthy()
    cleanup()
  })
})
