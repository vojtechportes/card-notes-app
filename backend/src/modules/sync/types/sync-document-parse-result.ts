import type { AcceptedSyncDocumentResult } from './accepted-sync-document-result'
import type { QuarantinedSyncDocumentResult } from './quarantined-sync-document-result'

export type SyncDocumentParseResult =
  AcceptedSyncDocumentResult | QuarantinedSyncDocumentResult
