import type { NoteDto } from '../../../types/api'
import { normalizeImageSource } from './normalize-image-source.util'
import { isImageNoteValue } from './is-image-note-value.util'

export const resolveNoteImageSource = (
  value: NoteDto['values'][string]
): string | undefined => {
  if (!isImageNoteValue(value)) {
    return undefined
  }

  if (typeof value.dataUrl === 'string' && value.dataUrl.trim().length > 0) {
    return value.dataUrl
  }

  if (typeof value.url === 'string' && value.url.trim().length > 0) {
    return value.url
  }

  if (typeof value.path === 'string' && value.path.trim().length > 0) {
    return normalizeImageSource(value.path)
  }

  return undefined
}
