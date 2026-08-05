import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import { createOAuthProviderConfigurations } from '../utils/create-oauth-provider-configurations.util.js'

type OAuthClientSecretConfigurations = ReadonlyMap<
  OAuthProviderEnum,
  Pick<OAuthProviderConfiguration, 'clientSecret'>
>

export const assertBundledGoogleOAuthClientSecret = (
  configurations: OAuthClientSecretConfigurations = createOAuthProviderConfigurations()
): void => {
  if (!configurations.get(OAuthProviderEnum.GoogleDrive)?.clientSecret) {
    throw new Error('Packaged Google OAuth client credential is missing.')
  }

  if (configurations.get(OAuthProviderEnum.OneDrive)?.clientSecret) {
    throw new Error('Packaged Microsoft OAuth client secret must be absent.')
  }
}
