export const oauthClientIdentityDefinitions = [
  {
    constantName: 'BUNDLED_GOOGLE_OAUTH_CLIENT_ID',
    environmentName: 'NOTESTACK_GOOGLE_OAUTH_CLIENT_ID',
    pattern: /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/,
    placeholder: '__NOTESTACK_GOOGLE_OAUTH_CLIENT_ID__',
  },
  {
    constantName: 'BUNDLED_MICROSOFT_OAUTH_CLIENT_ID',
    environmentName: 'NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    placeholder: '__NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID__',
  },
]
