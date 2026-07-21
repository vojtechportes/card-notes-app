import { Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import type { LabelDto, NoteTypeDto } from '../../../../../types/api'

interface ActiveFilterSummaryProps {
  labels: LabelDto[]
  noteTypes: NoteTypeDto[]
  selectedLabelIds: string[]
  selectedNoteTypeIds: string[]
}

export const ActiveFilterSummary = ({
  labels,
  noteTypes,
  selectedLabelIds,
  selectedNoteTypeIds,
}: ActiveFilterSummaryProps) => {
  const { t } = useTranslation()
  const selectedNoteTypes = noteTypes.filter((noteType) =>
    selectedNoteTypeIds.includes(noteType.id)
  )
  const selectedLabels = labels.filter((label) =>
    selectedLabelIds.includes(label.id)
  )

  if (selectedNoteTypes.length === 0 && selectedLabels.length === 0) {
    return null
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">
        {t('notes.toolbar.filters.active.title')}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {selectedNoteTypes.map((noteType) => (
          <Chip
            key={noteType.id}
            label={noteType.title}
            size="small"
            variant="filled"
          />
        ))}
        {selectedLabels.map((label) => (
          <LabelChip color={label.color} key={label.id} title={label.title} />
        ))}
      </Stack>
    </Stack>
  )
}
