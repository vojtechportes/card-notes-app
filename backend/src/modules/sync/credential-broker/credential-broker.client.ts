import { Injectable } from '@nestjs/common'
import { v4 as uuidV4 } from 'uuid'
import type { SyncProviderEnum } from '../types/sync-provider-enum'
import { credentialBrokerBootstrapState } from './credential-broker-bootstrap-state'
import type { BrokeredAccessCredential } from './types/brokered-access-credential'

@Injectable()
export class CredentialBrokerClient {
  async getAccessCredential(
    provider: SyncProviderEnum
  ): Promise<BrokeredAccessCredential> {
    const bootstrap = credentialBrokerBootstrapState.value

    if (!bootstrap) {
      throw new Error('Provider credentials are unavailable.')
    }

    let response: Response

    try {
      response = await fetch(`${bootstrap.baseUrl}/v1/access-token`, {
        body: JSON.stringify({ provider, requestId: uuidV4() }),
        headers: {
          Authorization: `Bearer ${bootstrap.authorization}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
    } catch {
      throw new Error('Provider credentials are unavailable.')
    }

    if (!response.ok) {
      throw new Error('Provider credentials are unavailable.')
    }

    const credential = (await response.json()) as BrokeredAccessCredential

    if (
      credential.provider !== provider ||
      typeof credential.accessToken !== 'string' ||
      !credential.accessToken ||
      Number.isNaN(Date.parse(credential.expiresAt))
    ) {
      throw new Error('Provider credentials are unavailable.')
    }

    return credential
  }
}
