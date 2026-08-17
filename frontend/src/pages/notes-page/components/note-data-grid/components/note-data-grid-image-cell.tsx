import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteDto } from '../../../../../types/api'
import { isMultiImageColumn } from '../../../../../utils/is-multi-image-column.util'
import { NoteImagePreview } from '../../note-field-value/components/note-image-preview'
import { isNoteImageValueList } from '../../../utils/is-note-image-value-list.util'
import { resolveNoteImageSource } from '../../../utils/resolve-note-image-source.util'
import type { NoteCardField } from '../../../types/note-card-field'

type ImageValue = Extract<NoteDto['values'][string], Record<string, unknown>>

interface NoteDataGridImageCellProps {
  config?: NoteCardField['config']
  title: string
  value: ImageValue | ImageValue[]
}

export const NoteDataGridImageCell = ({
  config,
  title,
  value,
}: NoteDataGridImageCellProps) => {
  const { t } = useTranslation()
  const imageValues = isNoteImageValueList(value) ? value : [value]
  const isMultiImage = isMultiImageColumn({ config, type: 'image' })
  const visibleImages = imageValues.slice(0, 1)
  const remainingCount = isMultiImage
    ? imageValues.length - visibleImages.length
    : 0

  return (
    <Box
      data-testid="note-data-grid-image-gallery"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
    >
      {visibleImages.map((image, index) => {
        const imageSource = resolveNoteImageSource(image)

        if (!imageSource) {
          return null
        }

        const alt = typeof image.altText === 'string' ? image.altText : title

        return (
          <Box
            key={`${imageSource}-${index}`}
            sx={{ flex: '0 0 48px', height: 48, width: 48 }}
          >
            <NoteImagePreview
              alt={alt}
              aspectRatio="1 / 1"
              closeOverlayLabel={t('notes.imageOverlay.actions.close')}
              enableOverlay
              maxWidth={48}
              src={imageSource}
            />
          </Box>
        )
      })}

      {remainingCount > 0 && (
        <Box
          aria-label={t('notes.card.moreImages', { count: remainingCount })}
          sx={{
            alignItems: 'center',
            backgroundColor: 'divider',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            color: 'text.secondary',
            display: 'flex',
            flex: '0 0 48px',
            height: 48,
            justifyContent: 'center',
            width: 48,
          }}
        >
          <Typography fontWeight={600} variant="body2">
            +{remainingCount}
          </Typography>
        </Box>
      )}

      {visibleImages.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          {t('notes.card.imagePreviewUnavailable')}
        </Typography>
      )}
    </Box>
  )
}
