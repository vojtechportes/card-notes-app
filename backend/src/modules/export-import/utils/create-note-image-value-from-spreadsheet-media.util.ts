import { posix } from 'node:path'
import type { NoteImageValue } from '../../notes/types/note-value'

export const createNoteImageValueFromSpreadsheetMedia = (
  mediaPath: string,
  buffer: Buffer
): NoteImageValue | null => {
  const fileName = posix.basename(mediaPath)
  const extension = posix.extname(fileName).slice(1).toLowerCase()

  if (!extension || buffer.length === 0) {
    return null
  }

  const mimeSubtype = extension === 'jpg' ? 'jpeg' : extension
  const mimeType = `image/${mimeSubtype}`

  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    fileName,
    mimeType,
    size: buffer.length,
  }
}
