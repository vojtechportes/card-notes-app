import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { AssetMigrationService } from './asset-migration.service'
import { AssetsController } from './assets.controller'
import { AssetsRepository } from './assets.repository'
import { AssetsService } from './assets.service'

@Module({
  imports: [DatabaseModule],
  controllers: [AssetsController],
  providers: [AssetMigrationService, AssetsRepository, AssetsService],
  exports: [AssetsRepository, AssetsService],
})
export class AssetsModule {}
