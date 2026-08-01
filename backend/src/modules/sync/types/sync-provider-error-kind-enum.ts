export enum SyncProviderErrorKindEnum {
  NotFound = 'not-found',
  PreconditionFailed = 'precondition-failed',
  Authentication = 'authentication',
  Throttled = 'throttled',
  Quota = 'quota',
  Transient = 'transient',
  Permanent = 'permanent',
  InvalidCursor = 'invalid-cursor',
}
