import type { OAuthProviderEnum } from './oauth-provider-enum'

export interface OAuthAccount {
  accountId: string
  displayName: string | null
  provider: OAuthProviderEnum
  tenantId: string | null
}
