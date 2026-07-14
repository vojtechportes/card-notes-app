import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { GeneralSection } from '../general-section/general-section'
import { UpdaterSection } from '../updater-section/updater-section'

export const GeneralSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.general.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.general.description')}
        </Typography>
      </Stack>

      <GeneralSection />
      <UpdaterSection />
    </Stack>
  )
}
