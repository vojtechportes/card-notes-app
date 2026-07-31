export interface SyncReconciliationResult {
  pulledCount: number
  pushedCount: number
  downloadedAssetCount: number
  uploadedAssetCount: number
  cursor: string | null
  followUpRun: boolean
}
