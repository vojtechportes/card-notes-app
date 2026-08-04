import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { DatabaseModule } from '../database/database.module'
import { CredentialBrokerClient } from './credential-broker/credential-broker.client'
import { GoogleNotificationCoordinator } from './google-drive/notification/google-notification.coordinator'
import { GoogleNotificationRepository } from './google-drive/notification/google-notification.repository'
import { SyncConflictRepository } from './sync-conflict.repository'
import { SyncConflictService } from './sync-conflict.service'
import { SyncController } from './sync.controller'
import { SyncOrchestrationRepository } from './sync-orchestration.repository'
import { SyncOrchestrationService } from './sync-orchestration.service'
import { SyncOutboxRepository } from './sync-outbox.repository'
import { SyncProviderFactory } from './sync-provider.factory'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import { SyncReconciliationService } from './sync-reconciliation.service'
import { SyncRemoteDocumentRepository } from './sync-remote-document.repository'

@Module({
  imports: [AssetsModule, DatabaseModule],
  controllers: [SyncController],
  providers: [
    CredentialBrokerClient,
    GoogleNotificationCoordinator,
    GoogleNotificationRepository,
    SyncConflictRepository,
    SyncConflictService,
    SyncOrchestrationRepository,
    SyncOrchestrationService,
    SyncOutboxRepository,
    SyncProviderFactory,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
  exports: [
    CredentialBrokerClient,
    SyncConflictRepository,
    SyncConflictService,
    SyncOrchestrationRepository,
    SyncOrchestrationService,
    SyncOutboxRepository,
    SyncProviderFactory,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
})
export class SyncModule {}
