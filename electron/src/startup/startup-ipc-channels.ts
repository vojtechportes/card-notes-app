export const startupIpcChannels = {
  exit: 'startup:exit',
  getState: 'startup:get-state',
  openBackendLog: 'startup:open-backend-log',
  retry: 'startup:retry',
  stateChanged: 'startup:state-changed',
} as const
