import type { OAuthProviderEnum } from './oauth-provider-enum.js'
import type { StoredOAuthCredential } from './stored-oauth-credential.js'

export interface CredentialStore {
  delete: (provider: OAuthProviderEnum) => void
  load: (provider: OAuthProviderEnum) => StoredOAuthCredential | null
  save: (provider: OAuthProviderEnum, credential: StoredOAuthCredential) => void
}
