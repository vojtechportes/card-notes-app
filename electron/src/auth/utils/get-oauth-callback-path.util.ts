import { OAUTH_CALLBACK_PATH_PREFIX } from '../constants/oauth-security.constants.js'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'

export const getOAuthCallbackPath = (provider: OAuthProviderEnum): string => {
  if (provider === OAuthProviderEnum.GoogleDrive) {
    return '/'
  }

  return `${OAUTH_CALLBACK_PATH_PREFIX}${provider}`
}
