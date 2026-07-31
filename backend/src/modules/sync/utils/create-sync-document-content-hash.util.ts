import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { createSha256Hash } from './create-sha-256-hash.util'
import { stableStringify } from './stable-stringify.util'

export const createSyncDocumentContentHash = (
  document: SyncRemoteDocument
): string => {
  if (!('contentHash' in document)) {
    return createSha256Hash(stableStringify(document))
  }

  const { contentHash: _contentHash, ...hashPreimage } = document

  return createSha256Hash(stableStringify(hashPreimage))
}
