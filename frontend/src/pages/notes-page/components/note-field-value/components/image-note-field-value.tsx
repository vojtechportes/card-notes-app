import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { NoteImagePreview } from './note-image-preview'
import type { NoteCardField } from '../../../types/note-card-field'
import { resolveNoteImageSource } from '../../../utils/resolve-note-image-source.util'

interface ImageNoteFieldValueProps {
  emptyImageLabel: string
  enableImageOverlay?: boolean
  imagePreviewMaxWidth?: number | string
  title: string
  value: Extract<NoteCardField['value'], Record<string, unknown>>
}

export const ImageNoteFieldValue = ({
  emptyImageLabel,
  enableImageOverlay = false,
  imagePreviewMaxWidth,
  title,
  value,
}: ImageNoteFieldValueProps) => {
  const { t } = useTranslation()
  const imageSource = resolveNoteImageSource(value)
  const imageAltText = typeof value.altText === 'string' ? value.altText : title
  const imageCaption =
    typeof value.fileName === 'string' && value.fileName.trim().length > 0
      ? value.fileName
      : typeof value.altText === 'string' && value.altText.trim().length > 0
        ? value.altText
        : emptyImageLabel

  return (
    <Stack spacing={1}>
      {imageSource && (
        <NoteImagePreview
          alt={imageAltText}
          closeOverlayLabel={t('notes.imageOverlay.actions.close')}
          enableOverlay={enableImageOverlay}
          maxWidth={imagePreviewMaxWidth}
          src={imageSource}
        />
      )}
      <Typography color="text.secondary" variant="body2">
        {imageCaption}
      </Typography>
    </Stack>
  )
}

