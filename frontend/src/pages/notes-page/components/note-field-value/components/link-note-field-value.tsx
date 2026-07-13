import { Typography } from '@mui/material'
import { getSafeExternalLink } from '../../../utils/get-safe-external-link.util'
import { truncateNoteText } from '../../../utils/truncate-note-text.util'

interface LinkNoteFieldValueProps {
  textTruncationLength: number | null
  value: string
}

export const LinkNoteFieldValue = ({
  textTruncationLength,
  value,
}: LinkNoteFieldValueProps) => {
  const safeExternalLink = getSafeExternalLink(value)
  const linkLabel = truncateNoteText(value, textTruncationLength)

  if (safeExternalLink) {
    return (
      <Typography
        component="a"
        href={safeExternalLink}
        rel="noreferrer noopener"
        sx={{
          color: 'primary.main',
          overflowWrap: 'anywhere',
          textDecoration: 'none',
        }}
        target="_blank"
        variant="body2"
      >
        {linkLabel}
      </Typography>
    )
  }

  return (
    <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
      {linkLabel}
    </Typography>
  )
}
