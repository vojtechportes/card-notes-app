import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SyncOutboxRepository } from './sync-outbox.repository'

@Module({
  imports: [DatabaseModule],
  providers: [SyncOutboxRepository],
  exports: [SyncOutboxRepository],
})
export class SyncModule {}
