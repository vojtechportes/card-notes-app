import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { DatabaseModule } from '../database/database.module'
import { SyncOutboxRepository } from './sync-outbox.repository'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import { SyncReconciliationService } from './sync-reconciliation.service'
import { SyncRemoteDocumentRepository } from './sync-remote-document.repository'

@Module({
  imports: [AssetsModule, DatabaseModule],
  providers: [
    SyncOutboxRepository,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
  exports: [
    SyncOutboxRepository,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
})
export class SyncModule {}
