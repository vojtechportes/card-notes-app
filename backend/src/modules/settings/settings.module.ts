import { Module } from '@nestjs/common'
import { NotesRepository } from '../notes/notes.repository'
import { DatabaseModule } from '../database/database.module'
import { ColumnsRepository } from './columns.repository'
import { GeneralSettingsRepository } from './general-settings.repository'
import { LabelsRepository } from './labels.repository'
import { LabelsService } from './labels.service'
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
    LabelsService,
    NoteTypesRepository,
    NotesRepository,
    SettingsService,
  ],
  exports: [LabelsService, SettingsService],
})
export class SettingsModule {}
