export const updaterIpcChannels = {
  checkForUpdates: 'updater:check-for-updates',
  downloadUpdate: 'updater:download-update',
  getPreferences: 'updater:get-preferences',
  getState: 'updater:get-state',
  installUpdate: 'updater:install-update',
  setAllowPrerelease: 'updater:set-allow-prerelease',
  stateChanged: 'updater:state-changed',
} as const
