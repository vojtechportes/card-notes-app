import { Alert, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useOAuthState } from '../../../../hooks/use-oauth-state'
import { SettingsSection } from '../settings-section'

export const OAuthDiagnosticsSection = () => {
  const { t } = useTranslation()
  const { available, state } = useOAuthState()

  if (!available) {
    return (
      <SettingsSection
        title={t('settings.developer.diagnostics.title')}
        description={t('settings.developer.diagnostics.description')}
      >
        <Alert severity="info">
          {t('settings.developer.diagnostics.desktopOnly')}
        </Alert>
      </SettingsSection>
    )
  }

  const provider = state.provider
    ? t(`settings.synchronization.providers.${state.provider}`)
    : t('settings.developer.diagnostics.none')
  const errorCode = state.errorCode ?? t('settings.developer.diagnostics.none')
  const diagnosticCode =
    state.diagnosticCode ?? t('settings.developer.diagnostics.none')

  return (
    <SettingsSection
      title={t('settings.developer.diagnostics.title')}
      description={t('settings.developer.diagnostics.description')}
    >
      <Stack spacing={1}>
        <Typography>
          {t('settings.developer.diagnostics.provider', { value: provider })}
        </Typography>
        <Typography component="div">
          {t('settings.developer.diagnostics.errorCode')}:{' '}
          <Typography component="code">{errorCode}</Typography>
        </Typography>
        <Typography component="div">
          {t('settings.developer.diagnostics.diagnosticCode')}:{' '}
          <Typography component="code">{diagnosticCode}</Typography>
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('settings.developer.diagnostics.safety')}
        </Typography>
      </Stack>
    </SettingsSection>
  )
}
