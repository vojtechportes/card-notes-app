import { Box, Stack, Typography } from '@mui/material'
import type { NoteCardField } from '../../types/note-card-field'
import { formatNoteDateValue } from '../../utils/format-note-date-value.util'
import { getSafeExternalLink } from '../../utils/get-safe-external-link.util'
import { hasRenderableNoteCardValue } from '../../utils/has-renderable-note-card-value.util'
import { isImageNoteValue } from '../../utils/is-image-note-value.util'
import { resolveNoteImageSource } from '../../utils/resolve-note-image-source.util'
import { truncateNoteText } from '../../utils/truncate-note-text.util'

interface NoteFieldValueProps {
  emptyImageLabel: string
  emptyValueLabel?: string
  field: NoteCardField
  textTruncationLength: number | null
}

export const NoteFieldValue = ({
  emptyImageLabel,
  emptyValueLabel,
  field,
  textTruncationLength,
}: NoteFieldValueProps) => {
  if (!hasRenderableNoteCardValue(field.value)) {
    return emptyValueLabel ? (
      <Typography color="text.secondary" variant="body2">
        {emptyValueLabel}
      </Typography>
    ) : null
  }

  if (field.type === 'image' && isImageNoteValue(field.value)) {
    const imageSource = resolveNoteImageSource(field.value)
    const imageCaption =
      typeof field.value.fileName === 'string' &&
      field.value.fileName.trim().length > 0
        ? field.value.fileName
        : typeof field.value.altText === 'string' &&
            field.value.altText.trim().length > 0
          ? field.value.altText
          : emptyImageLabel

    return (
      <Stack spacing={1}>
        {imageSource && (
          <Box
            sx={{
              alignItems: 'center',
              aspectRatio: '4 / 3',
              backgroundColor: 'background.default',
              borderRadius: 1.5,
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            <Box
              alt={field.value.altText ?? field.title}
              component="img"
              src={imageSource}
              sx={{
                display: 'block',
                height: '100%',
                objectFit: 'contain',
                width: '100%',
              }}
            />
          </Box>
        )}
        <Typography color="text.secondary" variant="body2">
          {imageCaption}
        </Typography>
      </Stack>
    )
  }

  if (field.type === 'link' && typeof field.value === 'string') {
    const safeExternalLink = getSafeExternalLink(field.value)
    const linkLabel = truncateNoteText(field.value, textTruncationLength)

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

  if (field.type === 'date' && typeof field.value === 'string') {
    return (
      <Typography variant="body2">
        {formatNoteDateValue(field.value)}
      </Typography>
    )
  }

  return (
    <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
      {typeof field.value === 'string'
        ? truncateNoteText(field.value, textTruncationLength)
        : String(field.value)}
    </Typography>
  )
}
