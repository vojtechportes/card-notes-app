import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface NoteTypeChipProps {
  title?: string
}

export const NoteTypeChip = ({ title }: NoteTypeChipProps) => {
  const { t } = useTranslation()

  if (!title) {
    return null
  }

  return (
    <Chip
      aria-label={t('notes.noteType.labelAria', { title })}
      label={title}
      size="small"
      variant="outlined"
    />
  )
}
