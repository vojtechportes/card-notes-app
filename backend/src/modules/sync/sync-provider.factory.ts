import { Inject, Injectable } from '@nestjs/common'
import { CredentialBrokerClient } from './credential-broker/credential-broker.client'
import { createBrokeredAccessTokenProvider } from './credential-broker/create-brokered-access-token-provider'
import { GoogleDriveSyncProviderAdapter } from './google-drive/google-drive-sync-provider.adapter'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import type { SyncProviderAdapter } from './types/sync-provider-adapter'
import { SyncProviderEnum } from './types/sync-provider-enum'
import type { SyncProviderFactoryContract } from './types/sync-provider-factory-contract'
import { SyncProviderUnavailableError } from './types/sync-provider-unavailable-error'

@Injectable()
export class SyncProviderFactory implements SyncProviderFactoryContract {
  constructor(
    @Inject(CredentialBrokerClient)
    private readonly credentialBrokerClient: CredentialBrokerClient,
    @Inject(SyncReconciliationRepository)
    private readonly reconciliationRepository: SyncReconciliationRepository
  ) {}

  create(provider: SyncProviderEnum, workspaceId: string): SyncProviderAdapter {
    if (provider !== SyncProviderEnum.GoogleDrive) {
      throw new SyncProviderUnavailableError(provider)
    }

    return new GoogleDriveSyncProviderAdapter({
      accessTokenProvider: createBrokeredAccessTokenProvider(
        this.credentialBrokerClient,
        provider
      ),
      objectMappingReader: this.reconciliationRepository,
      workspaceId,
    })
  }
}
