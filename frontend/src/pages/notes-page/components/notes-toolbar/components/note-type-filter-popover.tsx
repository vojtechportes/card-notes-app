import {
  Button,
  Divider,
  FormControlLabel,
  Popover,
  Stack,
  Typography,
  Checkbox,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteTypeDto } from '../../../../../types/api'

interface NoteTypeFilterPopoverProps {
  anchorEl: HTMLElement | null
  noteTypes: NoteTypeDto[]
  open: boolean
  selectedNoteTypeIds: string[]
  onClose: () => void
  onNoteTypeIdsChange: (noteTypeIds: string[]) => void
  isLoading: boolean
}

export const NoteTypeFilterPopover = ({
  anchorEl,
  noteTypes,
  open,
  selectedNoteTypeIds,
  onClose,
  onNoteTypeIdsChange,
  isLoading,
}: NoteTypeFilterPopoverProps) => {
  const { t } = useTranslation()

  const handleToggleNoteType = (noteTypeId: string) => {
    if (selectedNoteTypeIds.includes(noteTypeId)) {
      onNoteTypeIdsChange(
        selectedNoteTypeIds.filter((selectedId) => selectedId !== noteTypeId)
      )
      return
    }

    onNoteTypeIdsChange([...selectedNoteTypeIds, noteTypeId])
  }

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
    >
      <Stack spacing={2} sx={{ p: 2, width: 320, maxWidth: '100%' }}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">
            {t('notes.toolbar.filters.title')}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t('notes.toolbar.filters.description')}
          </Typography>
        </Stack>

        <Divider />

        {isLoading ? (
          <Typography color="text.secondary" variant="body2">
            {t('notes.toolbar.filters.status.loading')}
          </Typography>
        ) : noteTypes.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('notes.toolbar.filters.status.empty')}
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {noteTypes.map((noteType) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedNoteTypeIds.includes(noteType.id)}
                    onChange={() => handleToggleNoteType(noteType.id)}
                  />
                }
                key={noteType.id}
                label={noteType.title}
              />
            ))}
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Button
            disabled={selectedNoteTypeIds.length === 0}
            onClick={() => onNoteTypeIdsChange([])}
            size="small"
          >
            {t('notes.toolbar.filters.actions.clear')}
          </Button>
          <Button onClick={onClose} size="small" variant="contained">
            {t('notes.toolbar.filters.actions.close')}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  )
}
