import type { CreateNoteDto, UpdateNoteDto } from '../../../types/api'

type NoteRequestBody = CreateNoteDto | UpdateNoteDto

interface MultipartImageValue extends Record<string, unknown> {
  dataUrl?: string
  fileName?: string
  mimeType?: string
  sourceFile?: File
}

const notePayloadFieldName = 'payload'
const noteImageUploadFieldPrefix = 'note-image'
const base64Marker = ';base64,'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isFile = (value: unknown): value is File => {
  return typeof File !== 'undefined' && value instanceof File
}

const createUploadFieldName = (index: number): string => {
  return `${noteImageUploadFieldPrefix}-${index}`
}

const resolveDataUrlBlob = (dataUrl: string): Blob | null => {
  const separatorIndex = dataUrl.indexOf(',')

  if (separatorIndex < 0 || !dataUrl.startsWith('data:image/')) {
    return null
  }

  const metadata = dataUrl.slice(0, separatorIndex)
  const payload = dataUrl.slice(separatorIndex + 1)
  const mimeType = metadata.slice('data:'.length).split(';')[0]
  const isBase64 = metadata.includes(base64Marker.slice(0, -1))
  const binaryString = isBase64 ? atob(payload) : decodeURIComponent(payload)
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

const appendImageBlob = (
  formData: FormData,
  blob: Blob,
  uploadKey: string,
  fileName: string
): void => {
  formData.append(uploadKey, blob, fileName)
}

const resolveImageBlob = (
  imageValue: MultipartImageValue
): Blob | File | null => {
  if (isFile(imageValue.sourceFile)) {
    return imageValue.sourceFile
  }

  if (typeof imageValue.dataUrl !== 'string') {
    return null
  }

  return resolveDataUrlBlob(imageValue.dataUrl)
}

const resolveImageFileName = (
  imageValue: MultipartImageValue,
  uploadKey: string
): string => {
  if (isFile(imageValue.sourceFile)) {
    return imageValue.sourceFile.name
  }

  if (typeof imageValue.fileName === 'string' && imageValue.fileName.trim()) {
    return imageValue.fileName
  }

  return `${uploadKey}.png`
}

const resolveMultipartValue = (
  value: unknown,
  formData: FormData,
  uploadIndex: { value: number }
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveMultipartValue(item, formData, uploadIndex)
    )
  }

  if (!isRecord(value)) {
    return value
  }

  const imageValue = value as MultipartImageValue
  const imageBlob = resolveImageBlob(imageValue)

  if (!imageBlob) {
    return value
  }

  const uploadKey = createUploadFieldName(uploadIndex.value)
  const fileName = resolveImageFileName(imageValue, uploadKey)
  uploadIndex.value += 1

  appendImageBlob(formData, imageBlob, uploadKey, fileName)

  const { dataUrl, sourceFile, ...payloadValue } = imageValue

  void dataUrl
  void sourceFile

  return {
    ...payloadValue,
    uploadKey,
  }
}

export const createNoteRequestBody = <T extends NoteRequestBody>(
  note: T
): T | FormData => {
  const formData = new FormData()
  const uploadIndex = { value: 0 }
  const payload = {
    ...note,
    values: note.values
      ? Object.entries(note.values).reduce<Record<string, unknown>>(
          (result, [columnId, value]) => {
            result[columnId] = resolveMultipartValue(
              value,
              formData,
              uploadIndex
            )

            return result
          },
          {}
        )
      : undefined,
  }

  if (uploadIndex.value === 0) {
    return note
  }

  formData.append(notePayloadFieldName, JSON.stringify(payload))

  return formData
}
