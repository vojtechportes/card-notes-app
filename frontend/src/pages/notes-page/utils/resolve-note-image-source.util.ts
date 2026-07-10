import type { NoteDto } from '../../../types/api'
import { normalizeImageSource } from './normalize-image-source.util'
import { isImageNoteValue } from './is-image-note-value.util'

export const resolveNoteImageSource = (
  value: NoteDto['values'][string]
): string | undefined => {
  if (!isImageNoteValue(value)) {
    return undefined
  }

  if (typeof value.dataUrl === 'string') {
    const normalizedDataUrl = normalizeImageSource(value.dataUrl)

    if (normalizedDataUrl) {
      return normalizedDataUrl
    }
  }

  if (typeof value.url === 'string') {
    const normalizedUrl = normalizeImageSource(value.url)

    if (normalizedUrl) {
      return normalizedUrl
    }
  }

  if (typeof value.path === 'string') {
    return normalizeImageSource(value.path)
  }

  return undefined
}
