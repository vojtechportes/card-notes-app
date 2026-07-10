export const updaterIpcChannels = {
  checkForUpdates: 'updater:check-for-updates',
  downloadUpdate: 'updater:download-update',
  getState: 'updater:get-state',
  installUpdate: 'updater:install-update',
  stateChanged: 'updater:state-changed',
} as const
