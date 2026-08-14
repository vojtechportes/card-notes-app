import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NotesViewMode } from '../../types/notes-view-mode'

interface NotesPageHeaderProps {
  viewMode: NotesViewMode
  onViewModeChange: (viewMode: NotesViewMode) => void
}

export const NotesPageHeader = ({
  viewMode,
  onViewModeChange,
}: NotesPageHeaderProps) => {
  const { t } = useTranslation()

  return (
    <Stack
      component="header"
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      spacing={1.5}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Typography component="h2" variant="h4">
          {t('notes.title')}
        </Typography>
        <Typography color="text.secondary">{t('notes.description')}</Typography>
      </Stack>

      <ToggleButtonGroup
        exclusive
        aria-label={t('notes.viewSwitch.label')}
        size="small"
        value={viewMode}
        onChange={(_, nextViewMode: NotesViewMode | null) => {
          if (nextViewMode) {
            onViewModeChange(nextViewMode)
          }
        }}
        sx={{
          alignSelf: { xs: 'flex-end', sm: 'flex-start' },
          flexShrink: 0,
          maxWidth: '100%',
        }}
      >
        <Tooltip title={t('notes.viewSwitch.card.tooltip')}>
          <ToggleButton
            aria-label={t('notes.viewSwitch.card.label')}
            value="card"
          >
            <ViewModuleIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t('notes.viewSwitch.dataGrid.tooltip')}>
          <ToggleButton
            aria-label={t('notes.viewSwitch.dataGrid.label')}
            value="data-grid"
          >
            <ViewListIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Stack>
  )
}
