import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Modal, Stack } from '@mui/material'

interface ImageOverlayProps {
  alt: string
  closeLabel: string
  onClose: () => void
  open: boolean
  src: string
}

export const ImageOverlay = ({
  alt,
  closeLabel,
  onClose,
  open,
  src,
}: ImageOverlayProps) => {
  return (
    <Modal aria-label={alt} onClose={onClose} open={open}>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          inset: 0,
          justifyContent: 'center',
          p: 3,
          pointerEvents: 'none',
          position: 'fixed',
        }}
      >
        <Stack
          alignItems="flex-end"
          spacing={1.5}
          sx={{
            maxHeight: '80vh',
            maxWidth: '80vw',
            pointerEvents: 'auto',
          }}
        >
          <IconButton
            aria-label={closeLabel}
            onClick={onClose}
            size="small"
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 2,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'background.paper',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box
            alt={alt}
            component="img"
            src={src}
            sx={{
              display: 'block',
              maxHeight: '80vh',
              maxWidth: '80vw',
              objectFit: 'contain',
            }}
          />
        </Stack>
      </Box>
    </Modal>
  )
}

