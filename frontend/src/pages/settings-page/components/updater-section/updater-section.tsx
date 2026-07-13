import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import UpdateIcon from '@mui/icons-material/Update'
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { format, parseISO } from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DATE_TIME_FORMAT } from '../../../../constants/date-time-format'
import type { UpdaterState } from '../../../../types/notestack-updater'
import { useUpdaterState } from '../../hooks/use-updater-state/use-updater-state'
import { SettingsSection } from '../settings-section'
import { UpdaterMetadataItem } from './updater-metadata-item'

interface ActionConfig {
  disabled: boolean
  isPending: boolean
  key:
    | 'check'
    | 'checkDisabled'
    | 'download'
    | 'install'
    | 'installing'
    | 'checking'
    | 'downloading'
}

const formatReleaseDate = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  const parsedValue = parseISO(value)

  if (Number.isNaN(parsedValue.getTime())) {
    return value
  }

  return format(parsedValue, DATE_TIME_FORMAT)
}

const getStatusMessage = (
  state: UpdaterState,
  t: ReturnType<typeof useTranslation>['t']
): string => {
  switch (state.kind) {
    case 'unavailable':
      return t('settings.updater.status.unavailable')
    case 'idle':
      return t('settings.updater.status.idle')
    case 'checking':
      return t('settings.updater.status.checking')
    case 'available':
      return t('settings.updater.status.available', {
        version: state.update.version,
      })
    case 'downloading':
      return t('settings.updater.status.downloading', {
        percent: Math.round(state.progress.percent),
        version: state.update.version,
      })
    case 'downloaded':
      return t('settings.updater.status.downloaded', {
        version: state.update.version,
      })
    case 'installing':
      return t('settings.updater.status.installing', {
        version: state.update.version,
      })
    case 'error':
      return state.message
    default:
      return t('settings.updater.status.idle')
  }
}

const getActionConfig = (
  isUpdaterAvailable: boolean,
  state: UpdaterState
): ActionConfig => {
  if (!isUpdaterAvailable || state.kind === 'unavailable') {
    return {
      disabled: true,
      isPending: false,
      key: 'checkDisabled',
    }
  }

  switch (state.kind) {
    case 'checking':
      return {
        disabled: true,
        isPending: true,
        key: 'checking',
      }
    case 'available':
      return {
        disabled: false,
        isPending: false,
        key: 'download',
      }
    case 'downloading':
      return {
        disabled: true,
        isPending: true,
        key: 'downloading',
      }
    case 'downloaded':
      return {
        disabled: false,
        isPending: false,
        key: 'install',
      }
    case 'installing':
      return {
        disabled: true,
        isPending: true,
        key: 'installing',
      }
    case 'idle':
    case 'error':
    default:
      return {
        disabled: false,
        isPending: false,
        key: 'check',
      }
  }
}

const getActionLabel = (
  action: ActionConfig,
  t: ReturnType<typeof useTranslation>['t']
): string => {
  switch (action.key) {
    case 'download':
      return t('settings.updater.actions.download')
    case 'install':
      return t('settings.updater.actions.install')
    case 'checking':
      return t('settings.updater.actions.checking')
    case 'downloading':
      return t('settings.updater.actions.downloading')
    case 'installing':
      return t('settings.updater.actions.installing')
    case 'checkDisabled':
      return t('settings.updater.actions.unavailable')
    case 'check':
    default:
      return t('settings.updater.actions.check')
  }
}

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
    return getStatusMessage(state, t)
  }, [state, t])

  const actionConfig = useMemo(() => {
    return getActionConfig(isUpdaterAvailable, state)
  }, [isUpdaterAvailable, state])

  const releaseDate = useMemo(() => {
    switch (state.kind) {
      case 'available':
      case 'downloaded':
      case 'downloading':
      case 'installing':
        return formatReleaseDate(state.update.releaseDate)
      case 'error':
        return formatReleaseDate(state.update?.releaseDate ?? null)
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
  const buttonIsPending = actionConfig.isPending || isActionPending

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
              <Button
                disabled={actionConfig.disabled || buttonIsPending}
                onClick={() => {
                  void handleAction()
                }}
                startIcon={
                  actionConfig.key === 'install' ? (
                    <SystemUpdateAltIcon />
                  ) : (
                    <UpdateIcon />
                  )
                }
                variant="contained"
              >
                {getActionLabel(actionConfig, t)}
              </Button>
            </Stack>
          </>
        ) : null}
      </Stack>
    </SettingsSection>
  )
}
