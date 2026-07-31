import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SyncOutboxRepository } from './sync-outbox.repository'
import { SyncRemoteDocumentRepository } from './sync-remote-document.repository'

@Module({
  imports: [DatabaseModule],
  providers: [SyncOutboxRepository, SyncRemoteDocumentRepository],
  exports: [SyncOutboxRepository, SyncRemoteDocumentRepository],
})
export class SyncModule {}
