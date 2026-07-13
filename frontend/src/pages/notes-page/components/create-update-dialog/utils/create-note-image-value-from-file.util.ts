import type { NoteFormImageValue } from '../types/note-form-image-value'
import { readFileAsDataUrl } from './read-file-as-data-url.util'
import { readImageDimensions } from './read-image-dimensions.util'

export const createNoteImageValueFromFile = async (
  file: File
): Promise<NoteFormImageValue> => {
  const dataUrl = await readFileAsDataUrl(file)
  const dimensions = await readImageDimensions(dataUrl)
  const lastExtensionIndex = file.name.lastIndexOf('.')
  const altText =
    lastExtensionIndex > 0 ? file.name.slice(0, lastExtensionIndex) : file.name

  return {
    altText,
    dataUrl,
    fileName: file.name,
    height: dimensions.height,
    mimeType: file.type || undefined,
    size: file.size,
    sourceFile: file,
    width: dimensions.width,
  }
}
