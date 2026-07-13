import type { NoteCardFieldValue } from '../types/note-card-field'
import { isImageNoteValue } from './is-image-note-value.util'
import { isNoteImageValueList } from './is-note-image-value-list.util'

export const hasRenderableNoteCardValue = (
  value: NoteCardFieldValue | undefined
): value is NoteCardFieldValue => {
  if (value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (isNoteImageValueList(value)) {
    return value.some(hasRenderableNoteCardValue)
  }

  if (!isImageNoteValue(value)) {
    return false
  }

  return [
    value.dataUrl,
    value.url,
    value.path,
    value.fileName,
    value.altText,
  ].some(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
  )
}
