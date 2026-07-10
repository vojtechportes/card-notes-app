import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ColumnsSection } from './components/columns-section/columns-section'
import { DangerZoneSection } from './components/danger-zone-section/danger-zone-section'
import { ExportImportSection } from './components/export-import-section/export-import-section'
import { GeneralSection } from './components/general-section/general-section'
import { UpdaterSection } from './components/updater-section/updater-section'

export const SettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.description')}
        </Typography>
      </Stack>

      <Stack spacing={3}>
        <ColumnsSection />
        <GeneralSection />
        <UpdaterSection />
        <ExportImportSection />
        <DangerZoneSection />
      </Stack>
    </Stack>
  )
}
