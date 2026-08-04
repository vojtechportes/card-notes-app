import { describe, expect, it } from 'vitest'
import type { CredentialBrokerClient } from '../../../src/modules/sync/credential-broker/credential-broker.client'
import { GoogleDriveSyncProviderAdapter } from '../../../src/modules/sync/google-drive/google-drive-sync-provider.adapter'
import { OneDriveSyncProviderAdapter } from '../../../src/modules/sync/one-drive/one-drive-sync-provider.adapter'
import { SyncProviderFactory } from '../../../src/modules/sync/sync-provider.factory'
import type { SyncReconciliationRepository } from '../../../src/modules/sync/sync-reconciliation.repository'
import { SyncProviderEnum } from '../../../src/modules/sync/types/sync-provider-enum'

const workspaceId = '11111111-1111-4111-8111-111111111111'

describe('SyncProviderFactory', () => {
  it('creates both installed least-privilege provider adapters', () => {
    const credentialBrokerClient = {
      getAccessCredential: () =>
        Promise.resolve({
          accessToken: 'short-lived-token',
          expiresAt: '2026-08-04T15:00:00.000Z',
          provider: SyncProviderEnum.GoogleDrive,
        }),
    } as CredentialBrokerClient
    const reconciliationRepository = {
      findProviderObjectMetadata: () => null,
    } as unknown as SyncReconciliationRepository
    const factory = new SyncProviderFactory(
      credentialBrokerClient,
      reconciliationRepository
    )

    expect(
      factory.create(SyncProviderEnum.GoogleDrive, workspaceId)
    ).toBeInstanceOf(GoogleDriveSyncProviderAdapter)
    expect(
      factory.create(SyncProviderEnum.OneDrive, workspaceId)
    ).toBeInstanceOf(OneDriveSyncProviderAdapter)
  })
})
