export const windowControlsIpcChannels = {
  close: 'window-controls:close',
  getState: 'window-controls:get-state',
  minimize: 'window-controls:minimize',
  stateChanged: 'window-controls:state-changed',
  toggleMaximize: 'window-controls:toggle-maximize',
} as const
