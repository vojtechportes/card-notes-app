const GOOGLE_OAUTH_CLIENT_SECRET_PLACEHOLDER =
  '__NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET__'

export const getBundledOAuthClientSecret = (value: string): string => {
  return value === GOOGLE_OAUTH_CLIENT_SECRET_PLACEHOLDER ? '' : value
}
