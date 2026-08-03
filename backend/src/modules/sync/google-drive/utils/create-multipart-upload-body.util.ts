import { randomUUID } from 'node:crypto'

export interface MultipartUploadBody {
  body: Buffer
  contentType: string
}

export const createMultipartUploadBody = (
  metadata: Record<string, unknown>,
  bytes: Buffer,
  mediaType: string
): MultipartUploadBody => {
  const boundary = `notestack-${randomUUID()}`
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mediaType}\r\n\r\n`,
    'utf8'
  )
  const suffix = Buffer.from(`\r\n--${boundary}--`, 'utf8')

  return {
    body: Buffer.concat([prefix, bytes, suffix]),
    contentType: `multipart/related; boundary=${boundary}`,
  }
}
