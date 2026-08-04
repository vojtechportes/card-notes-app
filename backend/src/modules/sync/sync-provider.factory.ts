import { Inject, Injectable } from '@nestjs/common'
import { CredentialBrokerClient } from './credential-broker/credential-broker.client'
import { createBrokeredAccessTokenProvider } from './credential-broker/create-brokered-access-token-provider'
import { GoogleDriveSyncProviderAdapter } from './google-drive/google-drive-sync-provider.adapter'
import { OneDriveSyncProviderAdapter } from './one-drive/one-drive-sync-provider.adapter'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import type { SyncProviderAdapter } from './types/sync-provider-adapter'
import { SyncProviderEnum } from './types/sync-provider-enum'
import type { SyncProviderFactoryContract } from './types/sync-provider-factory-contract'

@Injectable()
export class SyncProviderFactory implements SyncProviderFactoryContract {
  constructor(
    @Inject(CredentialBrokerClient)
    private readonly credentialBrokerClient: CredentialBrokerClient,
    @Inject(SyncReconciliationRepository)
    private readonly reconciliationRepository: SyncReconciliationRepository
  ) {}

  create(provider: SyncProviderEnum, workspaceId: string): SyncProviderAdapter {
    const accessTokenProvider = createBrokeredAccessTokenProvider(
      this.credentialBrokerClient,
      provider
    )

    if (provider === SyncProviderEnum.OneDrive) {
      return new OneDriveSyncProviderAdapter({
        accessTokenProvider,
        objectMappingReader: this.reconciliationRepository,
        workspaceId,
      })
    }

    return new GoogleDriveSyncProviderAdapter({
      accessTokenProvider,
      objectMappingReader: this.reconciliationRepository,
      workspaceId,
    })
  }
}
