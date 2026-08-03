import type { SafeStorage } from 'electron'
import { SecureCredentialStore } from './credentials/secure-credential-store.js'
import { createOAuthLoopbackListener } from './oauth/create-oauth-loopback-listener.js'
import { OAuthService } from './oauth/oauth-service.js'
import { startCredentialBrokerServer } from './broker/start-credential-broker-server.js'
import type { AuthRuntime } from './types/auth-runtime.js'
import type { OAuthPublicState } from './types/oauth-public-state.js'
import { createOAuthProviderConfigurations } from './utils/create-oauth-provider-configurations.util.js'

interface CreateAuthRuntimeOptions {
  dataRoot: string
  onStateChange: (state: OAuthPublicState) => void
  openExternal: (url: string) => Promise<void>
  safeStorage: SafeStorage
}

export const createAuthRuntime = async (
  options: CreateAuthRuntimeOptions
): Promise<AuthRuntime> => {
  const credentialStore = new SecureCredentialStore(
    options.dataRoot,
    options.safeStorage
  )
  const oauthService = new OAuthService({
    configurations: createOAuthProviderConfigurations(),
    createLoopbackListener: createOAuthLoopbackListener,
    credentialStore,
    onStateChange: options.onStateChange,
    openExternal: options.openExternal,
  })
  const broker = await startCredentialBrokerServer({ oauthService })

  return {
    bootstrap: broker.bootstrap,
    dispose: () => {
      oauthService.dispose()
      void broker.dispose()
    },
    oauthService,
  }
}
