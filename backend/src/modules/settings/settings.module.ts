import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ColumnsRepository } from './columns.repository';
import { SettingsService } from './settings.service';

@Module({
  imports: [DatabaseModule],
  providers: [ColumnsRepository, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
