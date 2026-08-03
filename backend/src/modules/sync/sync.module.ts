import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { DatabaseModule } from '../database/database.module'
import { SyncConflictRepository } from './sync-conflict.repository'
import { SyncConflictService } from './sync-conflict.service'
import { SyncOutboxRepository } from './sync-outbox.repository'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import { SyncReconciliationService } from './sync-reconciliation.service'
import { SyncRemoteDocumentRepository } from './sync-remote-document.repository'
import { CredentialBrokerClient } from './credential-broker/credential-broker.client'

@Module({
  imports: [AssetsModule, DatabaseModule],
  providers: [
    CredentialBrokerClient,
    SyncConflictRepository,
    SyncConflictService,
    SyncOutboxRepository,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
  exports: [
    CredentialBrokerClient,
    SyncConflictRepository,
    SyncConflictService,
    SyncOutboxRepository,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
})
export class SyncModule {}
