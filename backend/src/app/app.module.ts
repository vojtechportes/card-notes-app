import { Module } from '@nestjs/common';
import { DatabaseModule } from '../modules/database/database.module';
import { HealthModule } from '../modules/health/health.module';
import { SettingsModule } from '../modules/settings/settings.module';

@Module({
  imports: [DatabaseModule, HealthModule, SettingsModule],
})
export class AppModule {}
