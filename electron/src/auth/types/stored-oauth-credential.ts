import type { OAuthAccount } from './oauth-account.js'

export interface StoredOAuthCredential {
  account: OAuthAccount
  refreshToken: string
}
