import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { Box, IconButton, Stack, Typography } from '@mui/material'
import { resolveNoteImageSource } from '../../../utils/resolve-note-image-source.util'
import type { NoteFormImageValue } from '../types/note-form-image-value'

interface NoteImageDropZonePreviewProps {
  emptyLabel: string
  getRemoveImageLabel: (caption: string) => string
  images: NoteFormImageValue[]
  label: string
  onRemoveImage: (index: number) => void
}

export const NoteImageDropZonePreview = ({
  emptyLabel,
  getRemoveImageLabel,
  images,
  label,
  onRemoveImage,
}: NoteImageDropZonePreviewProps) => {
  if (images.length === 0) {
    return (
      <Box
        sx={{
          color: 'text.secondary',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <ImageOutlinedIcon fontSize="large" />
      </Box>
    )
  }

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      {images.map((image, index) => {
        const imageSource = resolveNoteImageSource(image)
        const imageCaption =
          typeof image.fileName === 'string' && image.fileName.trim().length > 0
            ? image.fileName
            : typeof image.altText === 'string' &&
                image.altText.trim().length > 0
              ? image.altText
              : emptyLabel

        if (!imageSource) {
          return null
        }

        return (
          <Stack
            key={`${imageSource}-${index}`}
            spacing={0.5}
            sx={{ width: 128 }}
          >
            <Box
              sx={{
                alignItems: 'center',
                aspectRatio: '1 / 1',
                backgroundColor: 'background.default',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                display: 'flex',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                width: 128,
              }}
            >
              <Box
                alt={image.altText ?? label}
                component="img"
                src={imageSource}
                sx={{
                  display: 'block',
                  height: '100%',
                  objectFit: 'contain',
                  width: '100%',
                }}
              />
              <IconButton
                aria-label={getRemoveImageLabel(imageCaption)}
                color="error"
                onClick={() => onRemoveImage(index)}
                size="small"
                sx={{
                  backgroundColor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  position: 'absolute',
                  right: 6,
                  top: 6,
                  '&:hover': {
                    backgroundColor: 'background.paper',
                  },
                }}
                type="button"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography color="text.secondary" noWrap variant="body2">
              {imageCaption}
            </Typography>
          </Stack>
        )
      })}
    </Stack>
  )
}
