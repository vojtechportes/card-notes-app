import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveNoteImageSource } from '../../../utils/resolve-note-image-source.util'
import type { NoteFormImageValue } from '../types/note-form-image-value'
import { createNoteImageValueFromFile } from '../utils/create-note-image-value-from-file.util'

interface NoteImageDropZoneProps {
  errorMessage?: string
  label: string
  onChange: (value: NoteFormImageValue | null) => void
  onFileError: (message: string | null) => void
  value: NoteFormImageValue | null
}

export const NoteImageDropZone = ({
  errorMessage,
  label,
  onChange,
  onFileError,
  value,
}: NoteImageDropZoneProps) => {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const imageSource = value ? resolveNoteImageSource(value) : undefined

  const imageCaption =
    typeof value?.fileName === 'string' && value.fileName.trim().length > 0
      ? value.fileName
      : typeof value?.altText === 'string' && value.altText.trim().length > 0
        ? value.altText
        : t('notes.createUpdateDialog.imageDropZone.emptyPreview')

  const handleFiles = async (files: FileList | File[] | null | undefined) => {
    const file = files && files.length > 0 ? files[0] : undefined

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      onFileError(
        t('notes.createUpdateDialog.imageDropZone.errors.invalidType')
      )
      return
    }

    setIsProcessing(true)
    onFileError(null)

    try {
      const nextValue = await createNoteImageValueFromFile(file)
      onChange(nextValue)
    } catch {
      onFileError(t('notes.createUpdateDialog.imageDropZone.errors.readFailed'))
    } finally {
      setIsProcessing(false)

      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Box
        aria-busy={isProcessing}
        aria-label={t('notes.createUpdateDialog.imageDropZone.ariaLabel', {
          title: label,
        })}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
        role="group"
        sx={{
          backgroundColor: isDragging ? 'action.hover' : 'background.default',
          border: 1,
          borderColor: errorMessage
            ? 'error.main'
            : isDragging
              ? 'primary.main'
              : 'divider',
          borderRadius: 1.5,
          borderStyle: 'dashed',
          p: 2,
        }}
      >
        <input
          accept="image/*"
          hidden
          onChange={(event) => {
            void handleFiles(event.target.files)
          }}
          ref={inputRef}
          type="file"
        />

        <Stack spacing={2}>
          {imageSource ? (
            <Box
              sx={{
                alignItems: 'center',
                aspectRatio: '4 / 3',
                backgroundColor: 'background.paper',
                borderRadius: 1.5,
                display: 'flex',
                justifyContent: 'center',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <Box
                alt={value?.altText ?? label}
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
          ) : (
            <Box
              sx={{
                color: 'text.secondary',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <ImageOutlinedIcon fontSize="large" />
            </Box>
          )}

          <Stack spacing={1}>
            <Typography variant="body2">
              {t('notes.createUpdateDialog.imageDropZone.hint')}
            </Typography>

            {value && (
              <Typography color="text.secondary" variant="body2">
                {imageCaption}
              </Typography>
            )}

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                disabled={isProcessing}
                onClick={() => inputRef.current?.click()}
                startIcon={<CloudUploadOutlinedIcon />}
                type="button"
                variant="outlined"
              >
                {t(
                  value
                    ? 'notes.createUpdateDialog.imageDropZone.actions.replace'
                    : 'notes.createUpdateDialog.imageDropZone.actions.select'
                )}
              </Button>

              {value && (
                <Button
                  color="inherit"
                  onClick={() => {
                    onChange(null)
                    onFileError(null)
                  }}
                  startIcon={<DeleteOutlineIcon />}
                  type="button"
                >
                  {t('notes.createUpdateDialog.imageDropZone.actions.remove')}
                </Button>
              )}
            </Stack>

            {isProcessing && (
              <Typography color="text.secondary" variant="body2">
                {t('notes.createUpdateDialog.imageDropZone.status.processing')}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>

      {errorMessage && <FormHelperText error>{errorMessage}</FormHelperText>}
    </Stack>
  )
}
