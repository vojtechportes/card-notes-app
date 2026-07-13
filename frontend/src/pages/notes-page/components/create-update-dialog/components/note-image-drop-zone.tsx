import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NoteFormImageValue } from '../types/note-form-image-value'
import { createNoteImageValueFromFile } from '../utils/create-note-image-value-from-file.util'
import { NoteImageDropZonePreview } from './note-image-drop-zone-preview'

export type NoteImageDropZoneValue =
  NoteFormImageValue | NoteFormImageValue[] | null

interface NoteImageDropZoneProps {
  errorMessage?: string
  isMultiImage?: boolean
  label: string
  onChange: (value: NoteImageDropZoneValue) => void
  onFileError: (message: string | null) => void
  value: NoteImageDropZoneValue
}

const resolveImageValues = (
  value: NoteImageDropZoneValue
): NoteFormImageValue[] => {
  if (Array.isArray(value)) {
    return value
  }

  return value ? [value] : []
}

export const NoteImageDropZone = ({
  errorMessage,
  isMultiImage = false,
  label,
  onChange,
  onFileError,
  value,
}: NoteImageDropZoneProps) => {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const imageValues = resolveImageValues(value)

  const handleRemoveImage = (index: number) => {
    const nextValues = imageValues.filter(
      (_, imageIndex) => imageIndex !== index
    )

    onFileError(null)

    if (nextValues.length === 0) {
      onChange(null)
      return
    }

    onChange(isMultiImage ? nextValues : (nextValues[0] ?? null))
  }
  const handleFiles = async (files: FileList | File[] | null | undefined) => {
    const selectedFiles = Array.from(files ?? [])

    if (selectedFiles.length === 0) {
      return
    }

    const filesToRead = isMultiImage ? selectedFiles : selectedFiles.slice(0, 1)

    if (filesToRead.some((file) => !file.type.startsWith('image/'))) {
      onFileError(
        t('notes.createUpdateDialog.imageDropZone.errors.invalidType')
      )
      return
    }

    setIsProcessing(true)
    onFileError(null)

    try {
      const nextValues = await Promise.all(
        filesToRead.map((file) => createNoteImageValueFromFile(file))
      )

      if (isMultiImage) {
        const currentValues = Array.isArray(value)
          ? value
          : value
            ? [value]
            : []
        onChange([...currentValues, ...nextValues])
        return
      }

      onChange(nextValues[0] ?? null)
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
          multiple={isMultiImage}
          onChange={(event) => {
            void handleFiles(event.target.files)
          }}
          ref={inputRef}
          type="file"
        />

        <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center' }}>
          <NoteImageDropZonePreview
            emptyLabel={t(
              'notes.createUpdateDialog.imageDropZone.emptyPreview'
            )}
            getRemoveImageLabel={(caption) =>
              t('notes.createUpdateDialog.imageDropZone.actions.removeOne', {
                caption,
              })
            }
            images={imageValues}
            label={label}
            onRemoveImage={handleRemoveImage}
          />

          <Stack alignItems="center" spacing={1}>
            <Typography variant="body2">
              {t(
                isMultiImage
                  ? 'notes.createUpdateDialog.imageDropZone.multiHint'
                  : 'notes.createUpdateDialog.imageDropZone.hint'
              )}
            </Typography>

            <Typography color="text.secondary" variant="caption">
              {t('notes.createUpdateDialog.imageDropZone.supportedFormats')}
            </Typography>

            <Stack
              direction="row"
              justifyContent="center"
              spacing={1}
              sx={{ flexWrap: 'wrap' }}
            >
              <Button
                disabled={isProcessing}
                onClick={() => inputRef.current?.click()}
                startIcon={<CloudUploadOutlinedIcon />}
                type="button"
                variant="outlined"
              >
                {t(
                  imageValues.length > 0
                    ? isMultiImage
                      ? 'notes.createUpdateDialog.imageDropZone.actions.addMore'
                      : 'notes.createUpdateDialog.imageDropZone.actions.replace'
                    : 'notes.createUpdateDialog.imageDropZone.actions.select'
                )}
              </Button>

              {imageValues.length > 0 ? (
                <Button
                  color="inherit"
                  onClick={() => {
                    onChange(null)
                    onFileError(null)
                  }}
                  startIcon={<DeleteOutlineIcon />}
                  type="button"
                >
                  {t(
                    isMultiImage
                      ? 'notes.createUpdateDialog.imageDropZone.actions.removeAll'
                      : 'notes.createUpdateDialog.imageDropZone.actions.remove'
                  )}
                </Button>
              ) : null}
            </Stack>

            {isProcessing ? (
              <Typography color="text.secondary" variant="body2">
                {t('notes.createUpdateDialog.imageDropZone.status.processing')}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      {errorMessage ? (
        <FormHelperText error>{errorMessage}</FormHelperText>
      ) : null}
    </Stack>
  )
}
