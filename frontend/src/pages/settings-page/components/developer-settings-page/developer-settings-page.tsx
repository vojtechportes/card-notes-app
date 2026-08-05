import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DeveloperToolsSection } from '../developer-tools-section/developer-tools-section'
import { OAuthDiagnosticsSection } from '../oauth-diagnostics-section/oauth-diagnostics-section'

export const DeveloperSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.developer.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.developer.description')}
        </Typography>
      </Stack>

      <DeveloperToolsSection />
      <OAuthDiagnosticsSection />
    </Stack>
  )
}
