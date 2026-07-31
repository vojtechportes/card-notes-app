import type { SyncDocumentQuarantineReasonEnum } from './sync-document-quarantine-reason-enum'

export interface QuarantinedSyncDocumentResult {
  status: 'quarantined'
  reason: SyncDocumentQuarantineReasonEnum
}
