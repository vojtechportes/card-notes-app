import { BrowserWindow, ipcMain } from 'electron'
import { oauthIpcChannels } from './constants/oauth-ipc-channels.js'
import type { OAuthConnectOptions } from './types/oauth-connect-options.js'
import { OAuthProviderEnum } from './types/oauth-provider-enum.js'
import type { OAuthPublicState } from './types/oauth-public-state.js'
import type { OAuthServiceContract } from './types/oauth-service-contract.js'
import { isOAuthProvider } from './utils/is-oauth-provider.util.js'

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

  const validateOptions = (options: unknown): OAuthConnectOptions => {
    if (
      !options ||
      typeof options !== 'object' ||
      !isOAuthProvider((options as OAuthConnectOptions).provider)
    ) {
      throw new Error('oauth-invalid-request')
    }

    const typedOptions = options as OAuthConnectOptions

    if (
      typedOptions.expectedAccountId !== undefined &&
      typeof typedOptions.expectedAccountId !== 'string'
    ) {
      throw new Error('oauth-invalid-request')
    }

    return typedOptions
  }

  ipcMain.handle(oauthIpcChannels.cancel, () => oauthService.cancel())
  ipcMain.handle(oauthIpcChannels.connect, (_event, options: unknown) =>
    oauthService.connect(validateOptions(options))
  )
  ipcMain.handle(oauthIpcChannels.disconnect, (_event, provider: unknown) => {
    if (!isOAuthProvider(provider)) {
      throw new Error('oauth-invalid-request')
    }

    return oauthService.disconnect(provider)
  })
  ipcMain.handle(oauthIpcChannels.getState, () => oauthService.getState())
  ipcMain.handle(oauthIpcChannels.reconnect, (_event, options: unknown) =>
    oauthService.reconnect(validateOptions(options))
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
