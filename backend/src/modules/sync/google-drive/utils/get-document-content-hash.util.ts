import { createHash } from 'node:crypto'

export const getDocumentContentHash = (canonicalJson: string): string => {
  try {
    const value = JSON.parse(canonicalJson) as { contentHash?: unknown }
    if (typeof value.contentHash === 'string') {
      return value.contentHash
    }
  } catch {
    return createHash('sha256').update(canonicalJson).digest('hex')
  }

  return createHash('sha256').update(canonicalJson).digest('hex')
}
