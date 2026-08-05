import type { OAuthProviderEnum } from './oauth-provider-enum.js'

export interface OAuthProviderConfiguration {
  authorizationEndpoint: string
  clientId: string
  clientSecret: string | null
  issuerPrefixes: string[]
  jwksEndpoint: string
  provider: OAuthProviderEnum
  revocationEndpoint: string | null
  scopes: string[]
  tokenEndpoint: string
}
