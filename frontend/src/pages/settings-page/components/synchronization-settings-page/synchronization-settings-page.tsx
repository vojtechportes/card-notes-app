import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSyncProviderAvailabilityQuery } from '../../../../hooks/sync/use-sync-provider-availability-query'
import { useSyncStatusQuery } from '../../../../hooks/sync/use-sync-status-query'
import { SettingsSection } from '../settings-section'
import { PairingPreviewDialog } from './components/pairing-preview-dialog'
import { ProviderSelection } from './components/provider-selection'
import { SyncConflictsSection } from './components/sync-conflicts-section'
import { SyncStatusSummary } from './components/sync-status-summary'
import { useSynchronizationSettingsController } from './use-synchronization-settings-controller'

export const SynchronizationSettingsPage = () => {
  const { t } = useTranslation()
  const statusQuery = useSyncStatusQuery()
  const providersQuery = useSyncProviderAvailabilityQuery()
  const controller = useSynchronizationSettingsController(statusQuery.data)

  if (statusQuery.isLoading || providersQuery.isLoading) {
    return (
      <CircularProgress aria-label={t('settings.synchronization.loading')} />
    )
  }

  if (statusQuery.isError || providersQuery.isError || !statusQuery.data) {
    return (
      <Alert severity="error">{t('settings.synchronization.loadError')}</Alert>
    )
  }

  const status = statusQuery.data
  const hasRetainedBinding = Boolean(status.provider && status.workspaceId)
  const showProviders =
    controller.optInStarted || controller.showProviderSelection

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.synchronization.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.synchronization.description')}
        </Typography>
      </Stack>

      {controller.actionError ? (
        <Alert severity="error">
          {t('settings.synchronization.actionError')}
        </Alert>
      ) : null}

      <SettingsSection>
        {!status.isEnabled && !hasRetainedBinding ? (
          <Alert severity="info">
            {t('settings.synchronization.disabled.description')}
          </Alert>
        ) : (
          <SyncStatusSummary status={status} />
        )}

        {showProviders ? (
          <ProviderSelection
            busy={controller.busy}
            oauthAvailable={controller.oauthAvailable}
            onSelect={controller.selectProvider}
            providers={providersQuery.data ?? []}
          />
        ) : null}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          flexWrap="wrap"
        >
          {!status.isEnabled &&
          !hasRetainedBinding &&
          !controller.optInStarted ? (
            <Button
              disabled={controller.busy}
              onClick={controller.beginEnable}
              variant="contained"
            >
              {t('settings.synchronization.actions.enable')}
            </Button>
          ) : null}
          {!status.isEnabled && hasRetainedBinding ? (
            <Button
              disabled={controller.busy}
              onClick={() => controller.runCommand('enable')}
              variant="contained"
            >
              {t('settings.synchronization.actions.resume')}
            </Button>
          ) : null}
          {status.isEnabled ? (
            <>
              <Button
                disabled={controller.busy || status.state === 'syncing'}
                onClick={controller.syncNow}
                variant="contained"
              >
                {t('settings.synchronization.actions.syncNow')}
              </Button>
              <Button
                disabled={controller.busy}
                onClick={() => controller.runCommand('disable')}
              >
                {t('settings.synchronization.actions.disable')}
              </Button>
              <Button
                disabled={controller.busy}
                onClick={() => controller.setShowProviderSelection(true)}
              >
                {t('settings.synchronization.actions.changeProvider')}
              </Button>
            </>
          ) : null}
          {status.lastErrorClassification === 'authentication-required' ? (
            <Button disabled={controller.busy} onClick={controller.reconnect}>
              {t('settings.synchronization.actions.reconnect')}
            </Button>
          ) : null}
          {status.isEnabled && hasRetainedBinding ? (
            <Button
              disabled={controller.busy}
              onClick={() => void controller.runConfirmedCommand('repair')}
            >
              {t('settings.synchronization.actions.repair')}
            </Button>
          ) : null}
          {hasRetainedBinding ? (
            <Button
              color="error"
              disabled={controller.busy}
              onClick={() => void controller.runConfirmedCommand('disconnect')}
            >
              {t('settings.synchronization.actions.disconnect')}
            </Button>
          ) : null}
          {hasRetainedBinding ? (
            <Button
              color="error"
              disabled={controller.busy}
              onClick={() => void controller.runConfirmedCommand('reset')}
            >
              {t('settings.synchronization.actions.reset')}
            </Button>
          ) : null}
        </Stack>
      </SettingsSection>

      {status.unresolvedConflictCount > 0 ? <SyncConflictsSection /> : null}

      <PairingPreviewDialog
        busy={controller.busy}
        onCancel={controller.cancelPairing}
        onConfirm={controller.confirmPairing}
        operation={controller.pairing}
      />
    </Stack>
  )
}
