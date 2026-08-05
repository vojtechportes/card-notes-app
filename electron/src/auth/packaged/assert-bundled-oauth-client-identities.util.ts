import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import { createOAuthProviderConfigurations } from '../utils/create-oauth-provider-configurations.util.js'

type OAuthClientIdentityConfigurations = ReadonlyMap<
  OAuthProviderEnum,
  Pick<OAuthProviderConfiguration, 'clientId'>
>

export const assertBundledOAuthClientIdentities = (
  configurations: OAuthClientIdentityConfigurations = createOAuthProviderConfigurations()
): void => {
  for (const provider of Object.values(OAuthProviderEnum)) {
    if (!configurations.get(provider)?.clientId) {
      throw new Error(`Packaged OAuth client identity is missing: ${provider}.`)
    }
  }
}
