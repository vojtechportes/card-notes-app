import type { OAuthServiceContract } from './oauth-service-contract.js'

export interface CredentialBrokerServerOptions {
  host?: string
  oauthService: OAuthServiceContract
  port?: number
}
