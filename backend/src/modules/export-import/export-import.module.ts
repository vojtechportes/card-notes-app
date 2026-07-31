import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { DatabaseModule } from '../database/database.module'
import { NotesModule } from '../notes/notes.module'
import { SettingsModule } from '../settings/settings.module'
import { ExportImportController } from './export-import.controller'
import { ExportImportService } from './export-import.service'

@Module({
  imports: [AssetsModule, DatabaseModule, SettingsModule, NotesModule],
  controllers: [ExportImportController],
  providers: [ExportImportService],
})
export class ExportImportModule {}
