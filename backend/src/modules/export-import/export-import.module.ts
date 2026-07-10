import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { NotesModule } from '../notes/notes.module'
import { SettingsModule } from '../settings/settings.module'
import { ExportImportController } from './export-import.controller'
import { ExportImportService } from './export-import.service'

@Module({
  imports: [DatabaseModule, SettingsModule, NotesModule],
  controllers: [ExportImportController],
  providers: [ExportImportService],
})
export class ExportImportModule {}
