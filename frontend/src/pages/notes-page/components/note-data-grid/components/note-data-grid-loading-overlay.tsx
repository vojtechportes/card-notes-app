import { CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

export const NoteDataGridLoadingOverlay = () => {
  const { t } = useTranslation()

  return (
    <Stack
      alignItems="center"
      height="100%"
      justifyContent="center"
      spacing={1.5}
    >
      <CircularProgress size={24} />
      <Typography color="text.secondary" variant="body2">
        {t('notes.dataGrid.loading')}
      </Typography>
    </Stack>
  )
}
