import type { AccessCredential } from './access-credential.js'
import type { OAuthConnectOptions } from './oauth-connect-options.js'
import type { OAuthProviderEnum } from './oauth-provider-enum.js'
import type { OAuthPublicState } from './oauth-public-state.js'

export interface OAuthServiceContract {
  cancel: () => OAuthPublicState
  connect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  disconnect: (provider: OAuthProviderEnum) => Promise<OAuthPublicState>
  dispose: () => void
  getAccessCredential: (
    provider: OAuthProviderEnum
  ) => Promise<AccessCredential>
  getState: () => OAuthPublicState
  reconnect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
}
