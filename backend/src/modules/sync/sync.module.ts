import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { DatabaseModule } from '../database/database.module'
import { SyncConflictRepository } from './sync-conflict.repository'
import { SyncConflictService } from './sync-conflict.service'
import { SyncOutboxRepository } from './sync-outbox.repository'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import { SyncReconciliationService } from './sync-reconciliation.service'
import { SyncRemoteDocumentRepository } from './sync-remote-document.repository'

@Module({
  imports: [AssetsModule, DatabaseModule],
  providers: [
    SyncConflictRepository,
    SyncConflictService,
    SyncOutboxRepository,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
  exports: [
    SyncConflictRepository,
    SyncConflictService,
    SyncOutboxRepository,
    SyncReconciliationRepository,
    SyncReconciliationService,
    SyncRemoteDocumentRepository,
  ],
})
export class SyncModule {}
