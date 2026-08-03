import type { OAuthProviderEnum } from './oauth-provider-enum.js'

export interface AccessCredential {
  accessToken: string
  expiresAt: string
  provider: OAuthProviderEnum
}
