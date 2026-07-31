import { hasBufferPrefix } from './has-buffer-prefix.util'

export const detectImageMimeType = (buffer: Buffer): string | null => {
  if (
    hasBufferPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return 'image/png'
  }

  if (hasBufferPrefix(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }

  const header = buffer.subarray(0, 6).toString('ascii')

  if (header === 'GIF87a' || header === 'GIF89a') {
    return 'image/gif'
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}
