import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SettingsModule } from '../settings/settings.module'
import { NotesController } from './notes.controller'
import { NotesRepository } from './notes.repository'
import { NotesService } from './notes.service'

@Module({
  imports: [DatabaseModule, SettingsModule],
  controllers: [NotesController],
  providers: [NotesRepository, NotesService],
  exports: [NotesService],
})
export class NotesModule {}
