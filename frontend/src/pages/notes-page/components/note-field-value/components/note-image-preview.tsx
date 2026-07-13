import { Box } from '@mui/material'
import { useCallback, useState } from 'react'
import { ImageOverlay } from '../../../../../components/image-overlay'

interface NoteImagePreviewProps {
  alt: string
  aspectRatio?: string
  closeOverlayLabel: string
  enableOverlay?: boolean
  maxWidth?: number | string
  src: string
}

export const NoteImagePreview = ({
  alt,
  aspectRatio = '4 / 3',
  closeOverlayLabel,
  enableOverlay = false,
  maxWidth,
  src,
}: NoteImagePreviewProps) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)

  const openOverlay = useCallback(() => {
    if (!enableOverlay) {
      return
    }

    setIsOverlayOpen(true)
  }, [enableOverlay])

  const closeOverlay = useCallback(() => {
    setIsOverlayOpen(false)
  }, [])

  return (
    <>
      <Box
        aria-label={enableOverlay ? alt : undefined}
        component={enableOverlay ? 'button' : 'div'}
        onClick={enableOverlay ? openOverlay : undefined}
        sx={{
          background: 'transparent',
          border: 0,
          borderRadius: 1.5,
          cursor: enableOverlay ? 'zoom-in' : 'default',
          display: 'block',
          maxWidth,
          p: 0,
          textAlign: 'inherit',
          width: '100%',
        }}
        type={enableOverlay ? 'button' : undefined}
      >
        <Box
          sx={{
            alignItems: 'center',
            aspectRatio,
            backgroundColor: 'background.default',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <Box
            alt={alt}
            component="img"
            src={src}
            sx={{
              display: 'block',
              height: '100%',
              objectFit: 'contain',
              width: '100%',
            }}
          />
        </Box>
      </Box>
      {enableOverlay && (
        <ImageOverlay
          alt={alt}
          closeLabel={closeOverlayLabel}
          onClose={closeOverlay}
          open={isOverlayOpen}
          src={src}
        />
      )}
    </>
  )
}
