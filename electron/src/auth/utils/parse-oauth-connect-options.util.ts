import type { OAuthConnectOptions } from '../types/oauth-connect-options.js'
import { isOAuthProvider } from './is-oauth-provider.util.js'

export const parseOAuthConnectOptions = (
  value: unknown
): OAuthConnectOptions => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('oauth-invalid-request')
  }

  const keys = Object.keys(value)
  const provider = (value as { provider?: unknown }).provider

  if (
    keys.length !== 1 ||
    keys[0] !== 'provider' ||
    !isOAuthProvider(provider)
  ) {
    throw new Error('oauth-invalid-request')
  }

  return { provider }
}
