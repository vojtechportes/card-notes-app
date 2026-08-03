export const oauthIpcChannels = {
  cancel: 'oauth:cancel',
  connect: 'oauth:connect',
  disconnect: 'oauth:disconnect',
  getState: 'oauth:get-state',
  reconnect: 'oauth:reconnect',
  stateChanged: 'oauth:state-changed',
} as const
