import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app/app.module'
import { appConfig } from './config/app.config'
import { CreateNoteDto } from './modules/notes/types/create-note.dto'
import { ListNotesQueryDto } from './modules/notes/types/list-notes-query.dto'
import { UpdateNoteDto } from './modules/notes/types/update-note.dto'
import { CreateColumnDto } from './modules/settings/types/create-column.dto'
import { CreateNoteTypeDto } from './modules/settings/types/create-note-type.dto'
import { DeleteColumnQueryDto } from './modules/settings/types/delete-column-query.dto'
import { DeleteNoteTypeDto } from './modules/settings/types/delete-note-type.dto'
import { DeleteNoteTypeResultDto } from './modules/settings/types/delete-note-type-result.dto'
import { NoteTypeDetailDto } from './modules/settings/types/note-type-detail.dto'
import { NoteTypeDto } from './modules/settings/types/note-type.dto'
import { ReorderColumnsDto } from './modules/settings/types/reorder-columns.dto'
import { UpdateColumnDto } from './modules/settings/types/update-column.dto'
import { UpdateGeneralSettingsDto } from './modules/settings/types/update-general-settings.dto'
import { UpdateNoteTypeDto } from './modules/settings/types/update-note-type.dto'

const swaggerExtraModels = [
  CreateColumnDto,
  CreateNoteDto,
  CreateNoteTypeDto,
  DeleteColumnQueryDto,
  DeleteNoteTypeDto,
  DeleteNoteTypeResultDto,
  ListNotesQueryDto,
  NoteTypeDetailDto,
  NoteTypeDto,
  ReorderColumnsDto,
  UpdateColumnDto,
  UpdateGeneralSettingsDto,
  UpdateNoteTypeDto,
  UpdateNoteDto,
]

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.enableCors()
  app.setGlobalPrefix(appConfig.globalApiPrefix)

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NoteStack API')
    .setDescription('Local backend API for NoteStack.')
    .setVersion('0.1.0')
    .build()
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: swaggerExtraModels,
  })

  SwaggerModule.setup(`${appConfig.globalApiPrefix}/docs`, app, swaggerDocument)

  await app.listen(appConfig.port, appConfig.host)
}

void bootstrap()
