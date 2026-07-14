import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DangerZoneSection } from '../danger-zone-section/danger-zone-section'

export const DataManagementSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.dataManagement.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.dataManagement.description')}
        </Typography>
      </Stack>

      <DangerZoneSection />
    </Stack>
  )
}
