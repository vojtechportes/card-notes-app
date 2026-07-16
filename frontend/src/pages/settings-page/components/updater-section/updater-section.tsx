import { Alert, CircularProgress, Stack, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdaterState } from '../../hooks/use-updater-state/use-updater-state'
import { SettingsSection } from '../settings-section'
import { UpdaterActionButton } from './components/updater-action-button'
import { UpdaterMetadataItem } from './updater-metadata-item'
import { formatUpdaterReleaseDate } from './utils/format-updater-release-date.util'
import { getUpdaterActionConfig } from './utils/get-updater-action-config.util'
import { getUpdaterStatusMessage } from './utils/get-updater-status-message.util'

export const UpdaterSection = () => {
  const { t } = useTranslation()
  const {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    isLoading,
    isUpdaterAvailable,
    state,
  } = useUpdaterState()
  const [isActionPending, setIsActionPending] = useState(false)

  const statusMessage = useMemo(() => {
    return getUpdaterStatusMessage(state, t)
  }, [state, t])

  const actionConfig = useMemo(() => {
    return getUpdaterActionConfig(isUpdaterAvailable, state)
  }, [isUpdaterAvailable, state])

  const releaseDate = useMemo(() => {
    switch (state.kind) {
      case 'available':
      case 'downloaded':
      case 'downloading':
      case 'installing':
        return formatUpdaterReleaseDate(state.update.releaseDate)
      case 'error':
        return formatUpdaterReleaseDate(state.update?.releaseDate ?? null)
      default:
        return null
    }
  }, [state])

  const latestVersion = useMemo(() => {
    switch (state.kind) {
      case 'available':
      case 'downloaded':
      case 'downloading':
      case 'installing':
        return state.update.version
      case 'error':
        return state.update?.version ?? null
      default:
        return null
    }
  }, [state])

  const handleAction = useCallback(async () => {
    setIsActionPending(true)

    try {
      switch (actionConfig.key) {
        case 'download':
          await downloadUpdate()
          break
        case 'install':
          await installUpdate()
          break
        case 'check':
          await checkForUpdates()
          break
        default:
          break
      }
    } finally {
      setIsActionPending(false)
    }
  }, [actionConfig.key, checkForUpdates, downloadUpdate, installUpdate])

  const showLoadingState = isLoading && isUpdaterAvailable

  return (
    <SettingsSection
      description={t('settings.sections.updater.description')}
      title={t('settings.sections.updater.title')}
    >
      <Stack spacing={2}>
        <Typography color="text.secondary" variant="body2">
          {t('settings.updater.summary')}
        </Typography>

        {showLoadingState ? (
          <Stack alignItems="center" direction="row" spacing={1.5}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">
              {t('settings.updater.status.loading')}
            </Typography>
          </Stack>
        ) : null}

        {!showLoadingState ? (
          <>
            {state.kind === 'error' ? (
              <Alert severity="error">{statusMessage}</Alert>
            ) : (
              <Alert
                severity={state.kind === 'downloaded' ? 'success' : 'info'}
              >
                {statusMessage}
              </Alert>
            )}

            <Stack spacing={1.25}>
              <UpdaterMetadataItem
                label={t('settings.updater.fields.currentVersion')}
                value={state.currentVersion}
              />

              {latestVersion ? (
                <UpdaterMetadataItem
                  label={t('settings.updater.fields.latestVersion')}
                  value={latestVersion}
                />
              ) : null}

              {releaseDate ? (
                <UpdaterMetadataItem
                  label={t('settings.updater.fields.releaseDate')}
                  value={releaseDate}
                />
              ) : null}
            </Stack>

            <Stack
              alignItems={{ sm: 'center', xs: 'stretch' }}
              direction={{ sm: 'row', xs: 'column' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Typography color="text.secondary" variant="body2">
                {t('settings.updater.hint')}
              </Typography>
              <UpdaterActionButton
                actionConfig={actionConfig}
                isActionPending={isActionPending}
                onAction={handleAction}
              />
            </Stack>
          </>
        ) : null}
      </Stack>
    </SettingsSection>
  )
}
