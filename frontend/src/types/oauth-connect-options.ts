import type { OAuthProviderEnum } from './oauth-provider-enum'

export interface OAuthConnectOptions {
  expectedAccountId?: string
  provider: OAuthProviderEnum
}
