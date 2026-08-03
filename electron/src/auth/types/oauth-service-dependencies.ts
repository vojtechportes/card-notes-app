import type { CredentialStore } from './credential-store.js'
import type { OAuthFetch } from './oauth-fetch.js'
import type { OAuthLoopbackListener } from './oauth-loopback-listener.js'
import type { OAuthProviderConfiguration } from './oauth-provider-configuration.js'
import type { OAuthProviderEnum } from './oauth-provider-enum.js'
import type { OAuthPublicState } from './oauth-public-state.js'

export interface OAuthServiceDependencies {
  configurations: ReadonlyMap<OAuthProviderEnum, OAuthProviderConfiguration>
  createLoopbackListener: (
    provider: OAuthProviderEnum,
    expectedState: string,
    timeoutMs: number
  ) => Promise<OAuthLoopbackListener>
  credentialStore: CredentialStore
  fetchImplementation?: OAuthFetch
  now?: () => number
  onStateChange?: (state: OAuthPublicState) => void
  openExternal: (url: string) => Promise<void>
}
