import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { NoteTypesSection } from '../note-types-section/note-types-section'

export const NoteTemplatesSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.noteTemplates.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.noteTemplates.description')}
        </Typography>
      </Stack>

      <NoteTypesSection />
    </Stack>
  )
}
