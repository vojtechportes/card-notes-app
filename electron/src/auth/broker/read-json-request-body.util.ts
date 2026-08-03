import type { IncomingMessage } from 'node:http'

export const readJsonRequestBody = async (
  request: IncomingMessage,
  maximumBytes = 1024
): Promise<unknown> => {
  const chunks: Buffer[] = []
  let totalBytes = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalBytes += buffer.length

    if (totalBytes > maximumBytes) {
      throw new Error('broker-invalid-request')
    }

    chunks.push(buffer)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new Error('broker-invalid-request')
  }
}
