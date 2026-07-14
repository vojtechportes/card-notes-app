import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ExportImportSection } from '../export-import-section/export-import-section'

export const ExportImportSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.exportImport.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.exportImport.description')}
        </Typography>
      </Stack>

      <ExportImportSection />
    </Stack>
  )
}
