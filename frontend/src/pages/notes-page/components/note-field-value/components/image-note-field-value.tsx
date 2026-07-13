import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { MultiImageNoteFieldValue } from './multi-image-note-field-value'
import { NoteImagePreview } from './note-image-preview'
import type { NoteCardField } from '../../../types/note-card-field'
import { isNoteImageValueList } from '../../../utils/is-note-image-value-list.util'
import { resolveNoteImageSource } from '../../../utils/resolve-note-image-source.util'
import { isMultiImageColumn } from '../../../../../utils/is-multi-image-column.util'

interface ImageNoteFieldValueProps {
  emptyImageLabel: string
  enableImageOverlay?: boolean
  imagePreviewMaxWidth?: number | string
  title: string
  value:
    | Extract<NoteCardField['value'], Record<string, unknown>>
    | Array<Extract<NoteCardField['value'], Record<string, unknown>>>
  fieldConfig?: NoteCardField['config']
}

export const ImageNoteFieldValue = ({
  emptyImageLabel,
  enableImageOverlay = false,
  fieldConfig,
  imagePreviewMaxWidth,
  title,
  value,
}: ImageNoteFieldValueProps) => {
  const { t } = useTranslation()
  const isMultiImage = isMultiImageColumn({
    config: fieldConfig,
    type: 'image',
  })
  const imageValues = isNoteImageValueList(value) ? value : [value]

  if (isMultiImage) {
    return (
      <MultiImageNoteFieldValue
        emptyImageLabel={emptyImageLabel}
        enableImageOverlay={enableImageOverlay}
        images={imageValues}
        title={title}
      />
    )
  }

  const imageValue = imageValues[0]
  const imageSource = resolveNoteImageSource(imageValue)
  const imageAltText =
    typeof imageValue.altText === 'string' ? imageValue.altText : title
  const imageCaption =
    typeof imageValue.fileName === 'string' &&
    imageValue.fileName.trim().length > 0
      ? imageValue.fileName
      : typeof imageValue.altText === 'string' &&
          imageValue.altText.trim().length > 0
        ? imageValue.altText
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
