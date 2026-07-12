import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteTypeDetailDto } from '../../../../types/api'
import { ColumnsSection } from '../columns-section/columns-section'
import { NoteTypeMetadataItem } from './note-type-metadata-item'
import { formatSettingsDate } from './utils/format-settings-date.util'

interface NoteTypeDetailPanelProps {
  noteType?: NoteTypeDetailDto
  noteTypeId: string
  isError: boolean
  isLoading: boolean
}

export const NoteTypeDetailPanel = ({
  noteType,
  noteTypeId,
  isError,
  isLoading,
}: NoteTypeDetailPanelProps) => {
  const { t } = useTranslation()

  if (isLoading && !noteType) {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ p: 3 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">
          {t('settings.noteTypes.drawer.status.loading')}
        </Typography>
      </Stack>
    )
  }

  if (isError || !noteType) {
    return (
      <Stack sx={{ p: 3 }}>
        <Alert severity="error">{t('settings.noteTypes.drawer.status.error')}</Alert>
      </Stack>
    )
  }

  return (
    <Stack divider={<Divider flexItem />} spacing={0} sx={{ p: 3 }}>
      <Stack spacing={2.5} sx={{ pb: 3 }}>
        <NoteTypeMetadataItem
          label={t('settings.noteTypes.grid.columns.name')}
          value={noteType.title}
        />
        <NoteTypeMetadataItem
          label={t('settings.noteTypes.grid.columns.createdAt')}
          value={formatSettingsDate(noteType.createdAt)}
        />
        <NoteTypeMetadataItem
          label={t('settings.noteTypes.grid.columns.updatedAt')}
          value={formatSettingsDate(noteType.updatedAt)}
        />
      </Stack>

      <Stack spacing={2} sx={{ pt: 3 }}>
        <Stack spacing={0.75}>
          <Typography component="h3" variant="h6">
            {t('settings.sections.columns.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('settings.sections.columns.description')}
          </Typography>
        </Stack>

        <ColumnsSection noteTypeId={noteTypeId} variant="embedded" />
      </Stack>
    </Stack>
  )
}
