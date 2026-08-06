import { Module } from '@nestjs/common'
import { AssetsModule } from '../modules/assets/assets.module'
import { DatabaseModule } from '../modules/database/database.module'
import { ExportImportModule } from '../modules/export-import/export-import.module'
import { HealthModule } from '../modules/health/health.module'
import { NotesModule } from '../modules/notes/notes.module'
import { RuntimeDiagnosticsModule } from '../modules/runtime-diagnostics/runtime-diagnostics.module'
import { SettingsModule } from '../modules/settings/settings.module'
import { SyncModule } from '../modules/sync/sync.module'

@Module({
  imports: [
    DatabaseModule,
    AssetsModule,
    HealthModule,
    SettingsModule,
    NotesModule,
    ExportImportModule,
    RuntimeDiagnosticsModule,
    SyncModule,
  ],
})
export class AppModule {}
