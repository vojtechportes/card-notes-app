export interface SyncPullTransactionHooks {
  afterLocalApply?: () => void
  beforeCursorCommit?: () => void
}
