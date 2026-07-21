import { Module } from '@nestjs/common'
import { NotesRepository } from '../notes/notes.repository'
import { DatabaseModule } from '../database/database.module'
import { ColumnsRepository } from './columns.repository'
import { GeneralSettingsRepository } from './general-settings.repository'
import { LabelsRepository } from './labels.repository'
import { NoteTypesRepository } from './note-types.repository'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({
  imports: [DatabaseModule],
  controllers: [SettingsController],
  providers: [
    ColumnsRepository,
    GeneralSettingsRepository,
    LabelsRepository,
    NoteTypesRepository,
    NotesRepository,
    SettingsService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
