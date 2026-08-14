import {
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteTypeDto } from '../../../../../types/api'
import type { NotesViewMode } from '../../../types/notes-view-mode'

interface NoteTypeFilterSectionProps {
  isLoading: boolean
  noteTypes: NoteTypeDto[]
  selectedNoteTypeIds: string[]
  viewMode: NotesViewMode
  onNoteTypeIdsChange: (noteTypeIds: string[]) => void
}

export const NoteTypeFilterSection = ({
  isLoading,
  noteTypes,
  selectedNoteTypeIds,
  viewMode,
  onNoteTypeIdsChange,
}: NoteTypeFilterSectionProps) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {t('notes.toolbar.filters.noteTypes.title')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.noteTypes.status.loading')}
        </Typography>
      </Stack>
    )
  }

  if (noteTypes.length === 0) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {t('notes.toolbar.filters.noteTypes.title')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.noteTypes.status.empty')}
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={1}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">
          {t('notes.toolbar.filters.noteTypes.title')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t(`notes.toolbar.filters.noteTypes.description.${viewMode}`)}
        </Typography>
      </Stack>

      {viewMode === 'data-grid' ? (
        <RadioGroup
          aria-label={t('notes.toolbar.filters.noteTypes.dataGridLabel')}
          value={selectedNoteTypeIds[0] ?? ''}
          onChange={(event) => {
            onNoteTypeIdsChange([event.target.value])
          }}
        >
          {noteTypes.map((noteType) => (
            <FormControlLabel
              control={<Radio />}
              key={noteType.id}
              label={noteType.title}
              value={noteType.id}
            />
          ))}
        </RadioGroup>
      ) : (
        <Stack spacing={0.5}>
          {noteTypes.map((noteType) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedNoteTypeIds.includes(noteType.id)}
                  onChange={() => {
                    onNoteTypeIdsChange(
                      selectedNoteTypeIds.includes(noteType.id)
                        ? selectedNoteTypeIds.filter(
                            (selectedId) => selectedId !== noteType.id
                          )
                        : [...selectedNoteTypeIds, noteType.id]
                    )
                  }}
                />
              }
              key={noteType.id}
              label={noteType.title}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
