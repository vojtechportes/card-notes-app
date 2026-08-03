import type { OAuthConnectOptions } from './oauth-connect-options'
import type { OAuthProviderEnum } from './oauth-provider-enum'
import type { OAuthPublicState } from './oauth-public-state'

export interface NoteStackOAuthBridge {
  cancel: () => Promise<OAuthPublicState>
  connect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  disconnect: (provider: OAuthProviderEnum) => Promise<OAuthPublicState>
  getState: () => Promise<OAuthPublicState>
  reconnect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  subscribe: (listener: (state: OAuthPublicState) => void) => () => void
}
