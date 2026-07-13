import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteDto } from '../../../../../types/api'
import { resolveNoteImageSource } from '../../../utils/resolve-note-image-source.util'
import { NoteImagePreview } from './note-image-preview'

type ImageValue = Extract<NoteDto['values'][string], Record<string, unknown>>

interface MultiImageNoteFieldValueProps {
  emptyImageLabel: string
  enableImageOverlay: boolean
  images: ImageValue[]
  title: string
}

export const MultiImageNoteFieldValue = ({
  emptyImageLabel,
  enableImageOverlay,
  images,
  title,
}: MultiImageNoteFieldValueProps) => {
  const { t } = useTranslation()
  const visibleImages = enableImageOverlay ? images : images.slice(0, 1)
  const remainingCount = images.length - visibleImages.length

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {visibleImages.map((image, index) => {
        const imageSource = resolveNoteImageSource(image)
        const imageAltText =
          typeof image.altText === 'string' ? image.altText : title

        if (!imageSource) {
          return null
        }

        return (
          <NoteImagePreview
            alt={imageAltText}
            aspectRatio="1 / 1"
            closeOverlayLabel={t('notes.imageOverlay.actions.close')}
            enableOverlay={enableImageOverlay}
            key={`${imageSource}-${index}`}
            maxWidth={128}
            src={imageSource}
          />
        )
      })}

      {remainingCount > 0 ? (
        <Box
          aria-label={t('notes.card.moreImages', { count: remainingCount })}
          sx={{
            alignItems: 'center',
            aspectRatio: '1 / 1',
            backgroundColor: 'divider',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            color: 'text.secondary',
            display: 'flex',
            justifyContent: 'center',
            width: 128,
          }}
        >
          <Typography fontWeight={600} variant="body2">
            +{remainingCount}
          </Typography>
        </Box>
      ) : null}

      {visibleImages.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {emptyImageLabel}
        </Typography>
      ) : null}
    </Box>
  )
}
