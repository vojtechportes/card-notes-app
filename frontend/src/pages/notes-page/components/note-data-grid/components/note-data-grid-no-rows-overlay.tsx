import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

export const NoteDataGridNoRowsOverlay = () => {
  const { t } = useTranslation()

  return (
    <Stack
      alignItems="center"
      height="100%"
      justifyContent="center"
      spacing={1}
      textAlign="center"
    >
      <Typography component="h3" variant="h6">
        {t('notes.empty.title')}
      </Typography>
      <Typography color="text.secondary">
        {t('notes.empty.description')}
      </Typography>
    </Stack>
  )
}
