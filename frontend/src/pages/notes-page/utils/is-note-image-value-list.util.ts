import type { NoteDto } from '../../../types/api'
import { isImageNoteValue } from './is-image-note-value.util'

export const isNoteImageValueList = (
  value: NoteDto['values'][string] | undefined
): value is Array<
  Extract<NoteDto['values'][string], Record<string, unknown>>
> => {
  return (
    Array.isArray(value) && value.length > 0 && value.every(isImageNoteValue)
  )
}
