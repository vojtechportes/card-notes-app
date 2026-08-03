import type { CredentialBrokerBootstrap } from './credential-broker-bootstrap.js'
import type { OAuthServiceContract } from './oauth-service-contract.js'

export interface AuthRuntime {
  bootstrap: CredentialBrokerBootstrap
  dispose: () => void
  oauthService: OAuthServiceContract
}
