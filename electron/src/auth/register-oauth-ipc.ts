import { BrowserWindow, ipcMain } from 'electron'
import { oauthIpcChannels } from './constants/oauth-ipc-channels.js'
import { OAuthProviderEnum } from './types/oauth-provider-enum.js'
import type { OAuthPublicState } from './types/oauth-public-state.js'
import type { OAuthServiceContract } from './types/oauth-service-contract.js'
import { isOAuthProvider } from './utils/is-oauth-provider.util.js'
import { parseOAuthConnectOptions } from './utils/parse-oauth-connect-options.util.js'

export const registerOAuthIpc = (
  oauthService: OAuthServiceContract
): (() => void) => {
  const emitState = (state: OAuthPublicState): void => {
    for (const browserWindow of BrowserWindow.getAllWindows()) {
      if (!browserWindow.isDestroyed()) {
        browserWindow.webContents.send(oauthIpcChannels.stateChanged, state)
      }
    }
  }

  ipcMain.handle(oauthIpcChannels.cancel, () => oauthService.cancel())
  ipcMain.handle(oauthIpcChannels.connect, (_event, options: unknown) =>
    oauthService.connect(parseOAuthConnectOptions(options))
  )
  ipcMain.handle(oauthIpcChannels.disconnect, (_event, provider: unknown) => {
    if (!isOAuthProvider(provider)) {
      throw new Error('oauth-invalid-request')
    }

    return oauthService.disconnect(provider)
  })
  ipcMain.handle(oauthIpcChannels.getState, () => oauthService.getState())
  ipcMain.handle(oauthIpcChannels.reconnect, (_event, options: unknown) =>
    oauthService.reconnect(parseOAuthConnectOptions(options))
  )

  const originalStateChange = oauthService.getState()
  emitState(originalStateChange)

  return () => {
    for (const channel of [
      oauthIpcChannels.cancel,
      oauthIpcChannels.connect,
      oauthIpcChannels.disconnect,
      oauthIpcChannels.getState,
      oauthIpcChannels.reconnect,
    ]) {
      ipcMain.removeHandler(channel)
    }
  }
}

export { OAuthProviderEnum }
