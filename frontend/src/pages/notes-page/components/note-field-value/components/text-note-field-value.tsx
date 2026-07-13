import { Typography } from '@mui/material'
import { truncateNoteText } from '../../../utils/truncate-note-text.util'

interface TextNoteFieldValueProps {
  textTruncationLength: number | null
  value: string
}

export const TextNoteFieldValue = ({
  textTruncationLength,
  value,
}: TextNoteFieldValueProps) => {
  return (
    <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
      {truncateNoteText(value, textTruncationLength)}
    </Typography>
  )
}
