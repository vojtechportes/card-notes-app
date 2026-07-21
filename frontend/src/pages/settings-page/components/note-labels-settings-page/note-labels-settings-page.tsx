import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { NoteLabelsSection } from '../note-labels-section/note-labels-section'

export const NoteLabelsSettingsPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h4">
          {t('settings.pages.noteLabels.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('settings.pages.noteLabels.description')}
        </Typography>
      </Stack>

      <NoteLabelsSection />
    </Stack>
  )
}
