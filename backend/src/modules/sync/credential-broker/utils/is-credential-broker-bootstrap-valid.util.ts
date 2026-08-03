import type { CredentialBrokerBootstrap } from '../types/credential-broker-bootstrap'

export const isCredentialBrokerBootstrapValid = (
  value: unknown
): value is CredentialBrokerBootstrap => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const bootstrap = value as CredentialBrokerBootstrap

  try {
    const url = new URL(bootstrap.baseUrl)

    return (
      typeof bootstrap.authorization === 'string' &&
      bootstrap.authorization.length >= 32 &&
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      url.pathname === '/'
    )
  } catch {
    return false
  }
}
