import type { SyncRemoteDocument } from '../types/sync-remote-document'
import { getSyncDocumentAuthorityKey } from './get-sync-document-authority-key.util'

export const selectDeterministicSyncDocument = <
  TDocument extends SyncRemoteDocument,
>(
  left: TDocument,
  right: TDocument
): TDocument =>
  getSyncDocumentAuthorityKey(left).localeCompare(
    getSyncDocumentAuthorityKey(right)
  ) >= 0
    ? left
    : right
