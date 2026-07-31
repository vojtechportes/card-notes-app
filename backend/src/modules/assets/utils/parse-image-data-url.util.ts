export interface ParsedImageDataUrl {
  buffer: Buffer
  mimeType: string
}

export const parseImageDataUrl = (value: string): ParsedImageDataUrl | null => {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/]*={0,2})$/i.exec(
    value
  )

  if (!match || match[2].length === 0 || match[2].length % 4 === 1) {
    return null
  }

  const buffer = Buffer.from(match[2], 'base64')

  if (buffer.length === 0 || buffer.toString('base64') !== match[2]) {
    return null
  }

  return { buffer, mimeType: match[1].toLowerCase() }
}
