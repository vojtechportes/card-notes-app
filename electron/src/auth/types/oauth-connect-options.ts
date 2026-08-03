import type { OAuthProviderEnum } from './oauth-provider-enum.js'

export interface OAuthConnectOptions {
  expectedAccountId?: string
  provider: OAuthProviderEnum
}
