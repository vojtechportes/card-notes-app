import { Module } from '@nestjs/common'
import { DatabaseBackupService } from './database-backup.service'
import { createDatabaseOptions, DATABASE_OPTIONS } from './database-options'
import { DatabaseService } from './database.service'

@Module({
  providers: [
    {
      provide: DATABASE_OPTIONS,
      useFactory: createDatabaseOptions,
    },
    DatabaseBackupService,
    DatabaseService,
  ],
  exports: [DatabaseBackupService, DatabaseService],
})
export class DatabaseModule {}
