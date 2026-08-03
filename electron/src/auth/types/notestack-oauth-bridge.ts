import type { OAuthConnectOptions } from './oauth-connect-options.js'
import type { OAuthProviderEnum } from './oauth-provider-enum.js'
import type { OAuthPublicState } from './oauth-public-state.js'

export interface NoteStackOAuthBridge {
  cancel: () => Promise<OAuthPublicState>
  connect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  disconnect: (provider: OAuthProviderEnum) => Promise<OAuthPublicState>
  getState: () => Promise<OAuthPublicState>
  reconnect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  subscribe: (listener: (state: OAuthPublicState) => void) => () => void
}
