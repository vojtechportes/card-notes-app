import type { OAuthProviderEnum } from './oauth-provider-enum.js'

export interface OAuthAccount {
  accountId: string
  displayName: string | null
  provider: OAuthProviderEnum
  tenantId: string | null
}
