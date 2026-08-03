export enum SyncTriggerEnum {
  Startup = 'startup',
  LocalMutation = 'local-mutation',
  Manual = 'manual',
  Focus = 'focus',
  Resume = 'resume',
  NetworkRecovery = 'network-recovery',
  ProviderSignal = 'provider-signal',
  Watchdog = 'watchdog',
  PostPushVerification = 'post-push-verification',
  Quit = 'quit',
  ConflictResolution = 'conflict-resolution',
  Repair = 'repair',
}
