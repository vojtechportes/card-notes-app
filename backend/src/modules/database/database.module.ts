import { Module } from '@nestjs/common'
import { createDatabaseOptions, DATABASE_OPTIONS } from './database-options'
import { DatabaseService } from './database.service'

@Module({
  providers: [
    {
      provide: DATABASE_OPTIONS,
      useFactory: createDatabaseOptions,
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
