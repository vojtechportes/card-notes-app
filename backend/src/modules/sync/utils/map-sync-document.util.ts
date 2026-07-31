import { syncLogicalKeys } from '../constants/sync-logical-keys'
import type { MappedSyncDocument } from '../types/mapped-sync-document'
import type { SyncRemoteDocument } from '../types/sync-remote-document'
import type { SyncRemoteDocumentDraft } from '../types/sync-remote-document-draft'
import { canonicalizeSyncDocument } from './canonicalize-sync-document.util'
import { createSyncDocumentContentHash } from './create-sync-document-content-hash.util'
import { stableStringify } from './stable-stringify.util'

export const mapSyncDocument = (
  draft: SyncRemoteDocumentDraft
): MappedSyncDocument<SyncRemoteDocument> => {
  let document: SyncRemoteDocument
  let logicalKey: string

  if (!('entityType' in draft)) {
    document = draft
    logicalKey = syncLogicalKeys.workspace
  } else {
    const contentHash = createSyncDocumentContentHash({
      ...draft,
      contentHash: '',
    } as SyncRemoteDocument)
    document = { ...draft, contentHash } as SyncRemoteDocument
    logicalKey =
      draft.entityType === 'configuration'
        ? syncLogicalKeys.configuration
        : syncLogicalKeys.note(draft.entityId)
  }

  const canonicalDocument = canonicalizeSyncDocument(document)
  const contentHash = createSyncDocumentContentHash(canonicalDocument)

  if ('contentHash' in canonicalDocument) {
    canonicalDocument.contentHash = contentHash
  }

  return {
    logicalKey,
    document: canonicalDocument,
    canonicalJson: stableStringify(canonicalDocument),
    contentHash,
  }
}
