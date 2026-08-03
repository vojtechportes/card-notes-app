import type { SyncProviderEnum } from '../types/sync-provider-enum'
import type { CredentialBrokerClient } from './credential-broker.client'

export const createBrokeredAccessTokenProvider = (
  client: CredentialBrokerClient,
  provider: SyncProviderEnum
): (() => Promise<string>) => {
  return async () => {
    const credential = await client.getAccessCredential(provider)

    return credential.accessToken
  }
}
