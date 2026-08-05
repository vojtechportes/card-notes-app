import {
  Alert,
  Button,
  FormControlLabel,
  FormHelperText,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { useCallback, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeveloperToolsPreferences } from '../../hooks/use-developer-tools-preferences/use-developer-tools-preferences'
import { SettingsSection } from '../settings-section'

export const DeveloperToolsSection = () => {
  const { t } = useTranslation()
  const {
    available,
    enabled,
    error,
    loading,
    openDeveloperTools,
    saving,
    setEnabled,
  } = useDeveloperToolsPreferences()

  const handleEnabledChange = useCallback(
    (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
      void setEnabled(checked)
    },
    [setEnabled]
  )

  const handleOpenDeveloperTools = useCallback(() => {
    void openDeveloperTools()
  }, [openDeveloperTools])

  if (!available) {
    return (
      <Alert severity="info">
        {t('settings.developer.status.desktopOnly')}
      </Alert>
    )
  }

  return (
    <SettingsSection
      title={t('settings.sections.developer.title')}
      description={t('settings.sections.developer.description')}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                disabled={loading || saving}
                onChange={handleEnabledChange}
              />
            }
            label={t('settings.developer.fields.enabled')}
          />
          <FormHelperText>
            {t('settings.developer.hints.enabled')}
          </FormHelperText>
        </Stack>

        {loading ? (
          <Typography color="text.secondary">
            {t('settings.developer.status.loading')}
          </Typography>
        ) : null}

        {enabled ? (
          <Stack spacing={2} alignItems="flex-start">
            <Alert severity="warning">{t('settings.developer.warning')}</Alert>
            <Button variant="outlined" onClick={handleOpenDeveloperTools}>
              {t('settings.developer.actions.open')}
            </Button>
          </Stack>
        ) : null}

        {error ? (
          <Alert severity="error">
            {t('settings.developer.errors.action')}
          </Alert>
        ) : null}
      </Stack>
    </SettingsSection>
  )
}
