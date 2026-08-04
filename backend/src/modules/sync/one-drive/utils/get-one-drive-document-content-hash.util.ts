import { createOneDriveContentHash } from './create-one-drive-content-hash.util'

export const getOneDriveDocumentContentHash = (bytes: Buffer): string => {
  try {
    const value = JSON.parse(bytes.toString('utf8')) as {
      contentHash?: unknown
    }
    if (typeof value.contentHash === 'string') {
      return value.contentHash
    }
  } catch {
    return createOneDriveContentHash(bytes)
  }

  return createOneDriveContentHash(bytes)
}
