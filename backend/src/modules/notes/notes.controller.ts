import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { NotesService } from './notes.service'
import { CreateNoteDto } from './types/create-note.dto'
import { DeleteAllNotesResultDto } from './types/delete-all-notes-result.dto'
import { ListNotesQueryDto } from './types/list-notes-query.dto'
import { NoteDto } from './types/note.dto'
import { NoteSortDirectionEnum } from './types/note-sort-direction-enum'
import { NoteSortFieldEnum } from './types/note-sort-field-enum'
import type { NoteValuePatch, NoteValues } from './types/note-value'
import { UpdateNoteDto } from './types/update-note.dto'

interface NoteSortOptions {
  sortBy: NoteSortFieldEnum
  sortDirection: NoteSortDirectionEnum
}

@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(
    @Inject(NotesService) private readonly notesService: NotesService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a note' })
  @ApiCreatedResponse({ description: 'Created note.', type: NoteDto })
  createNote(@Body() body: CreateNoteDto = {}): NoteDto {
    return this.notesService.createNote({
      values: this.resolveNoteValues(body),
    })
  }

  @Get()
  @ApiOperation({ summary: 'List notes' })
  @ApiOkResponse({
    description: 'Notes sorted by the requested timestamp field.',
    type: NoteDto,
    isArray: true,
  })
  listNotes(@Query() query: ListNotesQueryDto): NoteDto[] {
    return this.notesService.listNotes(this.resolveSortOptions(query))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note by id' })
  @ApiParam({ name: 'id', description: 'Note id.' })
  @ApiOkResponse({ description: 'Requested note.', type: NoteDto })
  getNote(@Param('id') id: string): NoteDto {
    return this.notesService.getNote(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note values' })
  @ApiParam({ name: 'id', description: 'Note id.' })
  @ApiOkResponse({ description: 'Updated note.', type: NoteDto })
  updateNote(
    @Param('id') id: string,
    @Body() body: UpdateNoteDto = {}
  ): NoteDto {
    return this.notesService.updateNote(id, {
      values: this.resolveNoteValuePatch(body),
    })
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete all notes' })
  @ApiOkResponse({
    description:
      'All notes were deleted. Destructive operation; frontend confirmation is required before calling.',
    type: DeleteAllNotesResultDto,
  })
  deleteAllNotes(): DeleteAllNotesResultDto {
    return { deletedCount: this.notesService.deleteAllNotes() }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a note' })
  @ApiParam({ name: 'id', description: 'Note id.' })
  @ApiNoContentResponse({ description: 'Note was deleted.' })
  deleteNote(@Param('id') id: string): void {
    this.notesService.deleteNote(id)
  }

  private resolveNoteValues(body: CreateNoteDto): NoteValues | undefined {
    this.ensureRequestBodyIsRecord(body)

    if (body.values === undefined) {
      return undefined
    }

    this.ensureValuesAreRecord(body.values)

    return body.values as NoteValues
  }

  private resolveNoteValuePatch(
    body: UpdateNoteDto
  ): NoteValuePatch | undefined {
    this.ensureRequestBodyIsRecord(body)

    if (body.values === undefined) {
      return undefined
    }

    this.ensureValuesAreRecord(body.values)

    return body.values as NoteValuePatch
  }

  private ensureRequestBodyIsRecord(body: unknown): void {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Note request body must be an object.')
    }
  }

  private ensureValuesAreRecord(values: unknown): void {
    if (!this.isRecord(values)) {
      throw new BadRequestException(
        'Note values must be an object keyed by column id.'
      )
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private resolveSortOptions(query: ListNotesQueryDto = {}): NoteSortOptions {
    const sortBy = query.sortBy ?? NoteSortFieldEnum.CreatedAt
    const sortDirection = this.normalizeSortDirection(
      query.sortDirection ?? NoteSortDirectionEnum.Desc
    )

    if (!Object.values(NoteSortFieldEnum).includes(sortBy)) {
      throw new BadRequestException('Note sort field is not supported.')
    }

    if (!Object.values(NoteSortDirectionEnum).includes(sortDirection)) {
      throw new BadRequestException('Note sort direction is not supported.')
    }

    return { sortBy, sortDirection }
  }

  private normalizeSortDirection(
    sortDirection: NoteSortDirectionEnum
  ): NoteSortDirectionEnum {
    return String(sortDirection).toLowerCase() as NoteSortDirectionEnum
  }
}
