import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'

export const isOAuthProvider = (value: unknown): value is OAuthProviderEnum => {
  return Object.values(OAuthProviderEnum).includes(value as OAuthProviderEnum)
}
