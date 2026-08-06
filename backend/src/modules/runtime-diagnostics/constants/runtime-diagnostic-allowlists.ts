export const allowedRuntimeHttpMethods = [
  'DELETE',
  'GET',
  'PATCH',
  'POST',
  'PUT',
] as const

export const allowedRuntimePairingOperations = ['confirm'] as const

export const allowedRuntimePairingErrorCodes = [
  'account-mismatch',
  'pairing-failed',
  'remote-missing',
  'unsupported-remote-version',
] as const

export const allowedRuntimeProviders = ['google-drive', 'one-drive'] as const

export const allowedRuntimeSyncClassifications = [
  'authentication-required',
  'offline',
  'permanent',
  'provider-unavailable',
  'quota-exceeded',
  'remote-attention-required',
  'throttled',
  'unknown',
  'unsupported-remote-version',
] as const

export const allowedRuntimeSyncTriggers = [
  'background',
  'conflict-resolution',
  'focus',
  'local-mutation',
  'manual',
  'network-recovery',
  'post-push-verification',
  'provider-signal',
  'quit',
  'repair',
  'resume',
  'startup',
  'watchdog',
] as const
