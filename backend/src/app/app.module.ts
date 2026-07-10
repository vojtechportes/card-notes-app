import { Module } from '@nestjs/common'
import { DatabaseModule } from '../modules/database/database.module'
import { ExportImportModule } from '../modules/export-import/export-import.module'
import { HealthModule } from '../modules/health/health.module'
import { NotesModule } from '../modules/notes/notes.module'
import { SettingsModule } from '../modules/settings/settings.module'

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    SettingsModule,
    NotesModule,
    ExportImportModule,
  ],
})
export class AppModule {}
