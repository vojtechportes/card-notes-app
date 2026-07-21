import { Checkbox, FormControlLabel, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteTypeDto } from '../../../../../types/api'

interface NoteTypeFilterSectionProps {
  isLoading: boolean
  noteTypes: NoteTypeDto[]
  selectedNoteTypeIds: string[]
  onNoteTypeIdsChange: (noteTypeIds: string[]) => void
}

export const NoteTypeFilterSection = ({
  isLoading,
  noteTypes,
  selectedNoteTypeIds,
  onNoteTypeIdsChange,
}: NoteTypeFilterSectionProps) => {
  const { t } = useTranslation()

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">
        {t('notes.toolbar.filters.noteTypes.title')}
      </Typography>

      {isLoading ? (
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.noteTypes.status.loading')}
        </Typography>
      ) : noteTypes.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.noteTypes.status.empty')}
        </Typography>
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
