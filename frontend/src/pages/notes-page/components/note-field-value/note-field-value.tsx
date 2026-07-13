import { Typography } from '@mui/material'
import { ImageNoteFieldValue } from './components/image-note-field-value'
import { LinkNoteFieldValue } from './components/link-note-field-value'
import { NumberNoteFieldValue } from './components/number-note-field-value'
import { TextNoteFieldValue } from './components/text-note-field-value'
import type { NoteCardField } from '../../types/note-card-field'
import { formatNoteDateValue } from '../../utils/format-note-date-value.util'
import { hasRenderableNoteCardValue } from '../../utils/has-renderable-note-card-value.util'
import { isImageNoteValue } from '../../utils/is-image-note-value.util'
import { isNoteImageValueList } from '../../utils/is-note-image-value-list.util'

interface NoteFieldValueProps {
  emptyImageLabel: string
  emptyValueLabel?: string
  enableImageOverlay?: boolean
  field: NoteCardField
  imagePreviewMaxWidth?: number | string
  textTruncationLength: number | null
}

export const NoteFieldValue = ({
  emptyImageLabel,
  emptyValueLabel,
  enableImageOverlay = false,
  field,
  imagePreviewMaxWidth,
  textTruncationLength,
}: NoteFieldValueProps) => {
  if (!hasRenderableNoteCardValue(field.value)) {
    return emptyValueLabel ? (
      <Typography color="text.secondary" variant="body2">
        {emptyValueLabel}
      </Typography>
    ) : null
  }

  if (
    field.type === 'image' &&
    (isImageNoteValue(field.value) || isNoteImageValueList(field.value))
  ) {
    return (
      <ImageNoteFieldValue
        emptyImageLabel={emptyImageLabel}
        enableImageOverlay={enableImageOverlay}
        fieldConfig={field.config}
        imagePreviewMaxWidth={imagePreviewMaxWidth}
        title={field.title}
        value={field.value}
      />
    )
  }

  if (field.type === 'link' && typeof field.value === 'string') {
    return (
      <LinkNoteFieldValue
        textTruncationLength={textTruncationLength}
        value={field.value}
      />
    )
  }

  if (field.type === 'number') {
    return <NumberNoteFieldValue value={String(field.value)} />
  }

  if (field.type === 'date' && typeof field.value === 'string') {
    return (
      <Typography variant="body2">
        {formatNoteDateValue(field.value)}
      </Typography>
    )
  }

  return (
    <TextNoteFieldValue
      textTruncationLength={textTruncationLength}
      value={String(field.value)}
    />
  )
}
