import { Module } from '@nestjs/common';
import { DatabaseModule } from '../modules/database/database.module';
import { HealthModule } from '../modules/health/health.module';
import { NotesModule } from '../modules/notes/notes.module';
import { SettingsModule } from '../modules/settings/settings.module';

@Module({
  imports: [DatabaseModule, HealthModule, SettingsModule, NotesModule],
})
export class AppModule {}
