import {
  BUNDLED_GOOGLE_OAUTH_CLIENT_ID,
  BUNDLED_MICROSOFT_OAUTH_CLIENT_ID,
} from '../constants/oauth-client-identities.js'
import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import { getBundledOAuthClientId } from './get-bundled-oauth-client-id.util.js'

export const createOAuthProviderConfigurations = (): ReadonlyMap<
  OAuthProviderEnum,
  OAuthProviderConfiguration
> => {
  return new Map([
    [
      OAuthProviderEnum.GoogleDrive,
      {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId:
          process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID ??
          getBundledOAuthClientId(BUNDLED_GOOGLE_OAUTH_CLIENT_ID),
        issuerPrefixes: ['https://accounts.google.com', 'accounts.google.com'],
        jwksEndpoint: 'https://www.googleapis.com/oauth2/v3/certs',
        provider: OAuthProviderEnum.GoogleDrive,
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        scopes: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/drive.appdata',
        ],
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      },
    ],
    [
      OAuthProviderEnum.OneDrive,
      {
        authorizationEndpoint:
          'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        clientId:
          process.env.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID ??
          getBundledOAuthClientId(BUNDLED_MICROSOFT_OAUTH_CLIENT_ID),
        issuerPrefixes: ['https://login.microsoftonline.com/'],
        jwksEndpoint:
          'https://login.microsoftonline.com/common/discovery/v2.0/keys',
        provider: OAuthProviderEnum.OneDrive,
        revocationEndpoint: null,
        scopes: [
          'openid',
          'profile',
          'email',
          'offline_access',
          'Files.ReadWrite.AppFolder',
        ],
        tokenEndpoint:
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      },
    ],
  ])
}
