import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { UpdaterSection } from '../updater-section/updater-section'

export const UpdatesSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.updates.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.updates.description')}
        </Typography>
      </Stack>

      <UpdaterSection />
    </Stack>
  )
}
