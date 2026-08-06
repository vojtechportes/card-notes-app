import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmation } from '../../../../components/confirmation'
import { useCancelSyncPairingMutation } from '../../../../hooks/sync/use-cancel-sync-pairing-mutation'
import { useConfirmSyncPairingMutation } from '../../../../hooks/sync/use-confirm-sync-pairing-mutation'
import { usePrepareSyncPairingMutation } from '../../../../hooks/sync/use-prepare-sync-pairing-mutation'
import { useRunSyncNowMutation } from '../../../../hooks/sync/use-run-sync-now-mutation'
import { useSyncCommandMutation } from '../../../../hooks/sync/use-sync-command-mutation'
import { useOAuthState } from '../../../../hooks/use-oauth-state'
import type {
  SyncPairingOperationDto,
  SyncStatusDto,
} from '../../../../types/api'
import type { OAuthProviderEnum } from '../../../../types/oauth-provider-enum'

export const useSynchronizationSettingsController = (
  status: SyncStatusDto | undefined
) => {
  const { t } = useTranslation()
  const [pairing, setPairing] = useState<SyncPairingOperationDto | null>(null)
  const [showProviderSelection, setShowProviderSelection] = useState(false)
  const [optInStarted, setOptInStarted] = useState(false)
  const [actionError, setActionError] = useState(false)
  const confirmation = useConfirmation()
  const oauth = useOAuthState()
  const preparePairingMutation = usePrepareSyncPairingMutation()
  const confirmPairingMutation = useConfirmSyncPairingMutation()
  const cancelPairingMutation = useCancelSyncPairingMutation()
  const syncCommandMutation = useSyncCommandMutation()
  const runSyncMutation = useRunSyncNowMutation()

  const runSafely = useCallback(async (action: () => Promise<unknown>) => {
    setActionError(false)

    try {
      await action()
    } catch {
      setActionError(true)
    }
  }, [])

  const beginEnable = useCallback(() => {
    setOptInStarted(true)
  }, [])

  const selectProvider = useCallback(
    (provider: OAuthProviderEnum) => {
      void runSafely(async () => {
        const oauthState = await oauth.connect({ provider })
        if (oauthState.status !== 'connected' || !oauthState.account) {
          throw new Error('Provider authentication did not complete.')
        }

        const operation = await preparePairingMutation.mutateAsync({
          provider,
          retainPendingWork: Boolean(status?.pendingMutationCount),
        })

        setPairing(operation)
      })
    },
    [oauth, preparePairingMutation, runSafely, status?.pendingMutationCount]
  )

  const confirmPairing = useCallback(
    (decision: NonNullable<SyncPairingOperationDto['decision']>) => {
      if (!pairing) {
        return
      }

      void runSafely(async () => {
        const operation = await confirmPairingMutation.mutateAsync({
          id: pairing.id,
          input: { decision },
        })
        if (operation.status === 'failed') {
          throw new Error('Pairing failed.')
        }

        setPairing(null)
        setShowProviderSelection(false)
      })
    },
    [confirmPairingMutation, pairing, runSafely]
  )

  const cancelPairing = useCallback(() => {
    if (!pairing) {
      return
    }

    void runSafely(async () => {
      await cancelPairingMutation.mutateAsync(pairing.id)
      setPairing(null)
    })
  }, [cancelPairingMutation, pairing, runSafely])

  const runCommand = useCallback(
    (command: 'enable' | 'disable') => {
      void runSafely(() => syncCommandMutation.mutateAsync({ command }))
    },
    [runSafely, syncCommandMutation]
  )

  const runConfirmedCommand = useCallback(
    async (command: 'disconnect' | 'repair' | 'reset') => {
      const confirmed = await confirmation.confirm({
        title: t(`settings.synchronization.confirm.${command}.title`),
        description: t(
          `settings.synchronization.confirm.${command}.description`
        ),
        confirmLabel: t(`settings.synchronization.confirm.${command}.confirm`),
        variant: 'destructive',
      })

      if (!confirmed) {
        return
      }

      await runSafely(async () => {
        await syncCommandMutation.mutateAsync({ command, confirmed: true })
        if (command === 'disconnect' && status?.provider) {
          await oauth.disconnect(status.provider as OAuthProviderEnum)
        }
      })
    },
    [confirmation, oauth, runSafely, status?.provider, syncCommandMutation, t]
  )

  const reconnect = useCallback(() => {
    if (!status?.provider) {
      return
    }

    void runSafely(async () => {
      const provider = status.provider as OAuthProviderEnum
      await oauth.reconnect({ provider })
      await runSyncMutation.mutateAsync()
    })
  }, [oauth, runSafely, runSyncMutation, status])

  const syncNow = useCallback(() => {
    void runSafely(() => runSyncMutation.mutateAsync())
  }, [runSafely, runSyncMutation])

  const busy =
    preparePairingMutation.isPending ||
    confirmPairingMutation.isPending ||
    cancelPairingMutation.isPending ||
    syncCommandMutation.isPending ||
    runSyncMutation.isPending

  return {
    actionError,
    beginEnable,
    busy,
    cancelPairing,
    confirmPairing,
    oauthAvailable: oauth.available,
    optInStarted,
    pairing,
    reconnect,
    runCommand,
    runConfirmedCommand,
    selectProvider,
    setShowProviderSelection,
    showProviderSelection,
    syncNow,
  }
}
