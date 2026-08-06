import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SyncStatusDto } from '../../../../types/api'
import { OAuthProviderEnum } from '../../../../types/oauth-provider-enum'
import { useSynchronizationSettingsController } from './use-synchronization-settings-controller'

const mocks = vi.hoisted(() => ({
  cancelPairing: vi.fn(),
  confirm: vi.fn(),
  confirmPairing: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  preparePairing: vi.fn(),
  reconnect: vi.fn(),
  runSync: vi.fn(),
  syncCommand: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../../components/confirmation', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}))

vi.mock('../../../../hooks/use-oauth-state', () => ({
  useOAuthState: () => ({
    available: true,
    connect: mocks.connect,
    disconnect: mocks.disconnect,
    reconnect: mocks.reconnect,
  }),
}))

vi.mock('../../../../hooks/sync/use-prepare-sync-pairing-mutation', () => ({
  usePrepareSyncPairingMutation: () => ({
    isPending: false,
    mutateAsync: mocks.preparePairing,
  }),
}))

vi.mock('../../../../hooks/sync/use-confirm-sync-pairing-mutation', () => ({
  useConfirmSyncPairingMutation: () => ({
    isPending: false,
    mutateAsync: mocks.confirmPairing,
  }),
}))

vi.mock('../../../../hooks/sync/use-cancel-sync-pairing-mutation', () => ({
  useCancelSyncPairingMutation: () => ({
    isPending: false,
    mutateAsync: mocks.cancelPairing,
  }),
}))

vi.mock('../../../../hooks/sync/use-sync-command-mutation', () => ({
  useSyncCommandMutation: () => ({
    isPending: false,
    mutateAsync: mocks.syncCommand,
  }),
}))

vi.mock('../../../../hooks/sync/use-run-sync-now-mutation', () => ({
  useRunSyncNowMutation: () => ({
    isPending: false,
    mutateAsync: mocks.runSync,
  }),
}))

const createStatus = (
  overrides: Partial<SyncStatusDto> = {}
): SyncStatusDto => ({
  accountDisplayName: null,
  accountId: null,
  dataRevision: 0,
  isEnabled: false,
  isStartupReady: true,
  lastAttemptedAt: null,
  lastErrorClassification: null,
  lastSucceededAt: null,
  lastTrigger: null,
  pendingMutationCount: 0,
  provider: null,
  state: 'disabled',
  unresolvedConflictCount: 0,
  workspaceDisplayName: null,
  workspaceId: null,
  ...overrides,
})

describe('useSynchronizationSettingsController', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps the OAuth account identity out of the pairing request', async () => {
    mocks.connect.mockResolvedValue({
      account: {
        accountId: 'google-oidc-subject',
        displayName: 'Google account',
        provider: 'google-drive',
        tenantId: null,
      },
      diagnosticCode: null,
      errorCode: null,
      provider: 'google-drive',
      status: 'connected',
    })
    mocks.preparePairing.mockResolvedValue({ id: 'pairing-operation' })
    const { result } = renderHook(() =>
      useSynchronizationSettingsController(
        createStatus({ pendingMutationCount: 2 })
      )
    )

    act(() => result.current.selectProvider(OAuthProviderEnum.GoogleDrive))

    await waitFor(() => {
      expect(mocks.preparePairing).toHaveBeenCalledWith({
        provider: 'google-drive',
        retainPendingWork: true,
      })
    })
    expect(mocks.preparePairing.mock.calls[0][0]).not.toHaveProperty(
      'expectedAccountId'
    )
  })

  it('keeps the provider-native account identity out of OAuth reconnect', async () => {
    mocks.reconnect.mockResolvedValue({ status: 'connected' })
    mocks.runSync.mockResolvedValue({ state: 'synced' })
    const { result } = renderHook(() =>
      useSynchronizationSettingsController(
        createStatus({
          accountId: 'google-drive-permission-id',
          provider: 'google-drive',
        })
      )
    )

    act(() => result.current.reconnect())

    await waitFor(() => {
      expect(mocks.reconnect).toHaveBeenCalledWith({
        provider: 'google-drive',
      })
    })
    await waitFor(() => expect(mocks.runSync).toHaveBeenCalledOnce())
    expect(mocks.reconnect.mock.calls[0][0]).not.toHaveProperty(
      'expectedAccountId'
    )
  })

  it('does not synchronize when OAuth reconnect fails', async () => {
    mocks.reconnect.mockRejectedValue(new Error('oauth-account-mismatch'))
    const { result } = renderHook(() =>
      useSynchronizationSettingsController(
        createStatus({
          accountId: 'google-drive-permission-id',
          provider: 'google-drive',
        })
      )
    )

    act(() => result.current.reconnect())

    await waitFor(() => expect(result.current.actionError).toBe(true))
    expect(mocks.runSync).not.toHaveBeenCalled()
  })
})
