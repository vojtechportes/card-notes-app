import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

@Module({
  imports: [DatabaseModule, SettingsModule],
  providers: [NotesRepository, NotesService],
  exports: [NotesService],
})
export class NotesModule {}
