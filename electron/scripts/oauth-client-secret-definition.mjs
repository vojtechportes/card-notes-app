export const oauthClientSecretDefinition = {
  constantName: 'BUNDLED_GOOGLE_OAUTH_CLIENT_SECRET',
  environmentName: 'NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET',
  pattern: /^[A-Za-z0-9._~-]{1,256}$/,
  placeholder: '__NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET__',
}
