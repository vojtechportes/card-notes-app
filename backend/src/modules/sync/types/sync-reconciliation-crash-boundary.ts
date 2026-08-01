export type SyncReconciliationCrashBoundary =
  | 'before-local-apply'
  | 'after-local-apply'
  | 'before-cursor-commit'
  | 'after-cursor-commit'
  | 'before-remote-write'
  | 'after-remote-write'
  | 'before-outbox-complete'
  | 'after-outbox-complete'
