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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { NotesService } from './notes.service'
import { CreateNoteDto } from './types/create-note.dto'
import { DeleteAllNotesResultDto } from './types/delete-all-notes-result.dto'
import { ListNotesQueryDto } from './types/list-notes-query.dto'
import { NoteDto } from './types/note.dto'
import { NoteSortDirectionEnum } from './types/note-sort-direction-enum'
import { NoteSortFieldEnum } from './types/note-sort-field-enum'
import type {
  NoteImageValue,
  NoteValue,
  NoteValuePatch,
  NoteValues,
} from './types/note-value'
import { UpdateNoteDto } from './types/update-note.dto'

interface NoteUploadFile {
  buffer?: Buffer
  fieldname?: string
  mimetype?: string
  originalname?: string
  size?: number
}

interface NoteSortOptions {
  noteTypeIds?: string[]
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
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: 25 * 1024 * 1024,
        files: 50,
      },
    })
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({ type: CreateNoteDto })
  @ApiOperation({ summary: 'Create a note' })
  @ApiCreatedResponse({ description: 'Created note.', type: NoteDto })
  createNote(
    @Body() body: CreateNoteDto = {} as CreateNoteDto,
    @UploadedFiles() files: NoteUploadFile[] = []
  ): NoteDto {
    const payload = this.resolveMultipartPayload<CreateNoteDto>(body)
    const filesByUploadKey = this.createFilesByUploadKey(files)

    return this.notesService.createNote({
      noteTypeId: this.resolveNoteTypeId(payload),
      values: this.resolveUploadedNoteValues(
        this.resolveNoteValues(payload),
        filesByUploadKey
      ),
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
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: 25 * 1024 * 1024,
        files: 50,
      },
    })
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({ type: UpdateNoteDto })
  @ApiOperation({ summary: 'Update note values' })
  @ApiParam({ name: 'id', description: 'Note id.' })
  @ApiOkResponse({ description: 'Updated note.', type: NoteDto })
  updateNote(
    @Param('id') id: string,
    @Body() body: UpdateNoteDto = {},
    @UploadedFiles() files: NoteUploadFile[] = []
  ): NoteDto {
    const payload = this.resolveMultipartPayload<UpdateNoteDto>(body)
    const filesByUploadKey = this.createFilesByUploadKey(files)

    return this.notesService.updateNote(id, {
      values: this.resolveUploadedNoteValuePatch(
        this.resolveNoteValuePatch(payload),
        filesByUploadKey
      ),
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

  private resolveNoteTypeId(body: CreateNoteDto): string {
    this.ensureRequestBodyIsRecord(body)

    if (typeof body.noteTypeId !== 'string' || !body.noteTypeId.trim()) {
      throw new BadRequestException('Note type id is required.')
    }

    return body.noteTypeId.trim()
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

  private resolveMultipartPayload<T>(body: T | Record<string, unknown>): T {
    if (!this.isRecord(body) || typeof body.payload !== 'string') {
      return body as T
    }

    try {
      const payload = JSON.parse(body.payload) as unknown

      this.ensureRequestBodyIsRecord(payload)

      return payload as T
    } catch {
      throw new BadRequestException(
        'Multipart note payload must be valid JSON.'
      )
    }
  }

  private createFilesByUploadKey(
    files: NoteUploadFile[]
  ): Map<string, NoteUploadFile> {
    const filesByUploadKey = new Map<string, NoteUploadFile>()

    for (const file of files) {
      if (!file.fieldname) {
        continue
      }

      filesByUploadKey.set(file.fieldname, file)
    }

    return filesByUploadKey
  }

  private resolveUploadedNoteValues(
    values: NoteValues | undefined,
    filesByUploadKey: Map<string, NoteUploadFile>
  ): NoteValues | undefined {
    if (!values) {
      return undefined
    }

    return Object.entries(values).reduce<NoteValues>(
      (result, [columnId, value]) => {
        result[columnId] = this.resolveUploadedNoteValue(
          value,
          filesByUploadKey
        )

        return result
      },
      {}
    )
  }

  private resolveUploadedNoteValuePatch(
    values: NoteValuePatch | undefined,
    filesByUploadKey: Map<string, NoteUploadFile>
  ): NoteValuePatch | undefined {
    if (!values) {
      return undefined
    }

    return Object.entries(values).reduce<NoteValuePatch>(
      (result, [columnId, value]) => {
        result[columnId] =
          value === null
            ? null
            : this.resolveUploadedNoteValue(value, filesByUploadKey)

        return result
      },
      {}
    )
  }

  private resolveUploadedNoteValue(
    value: NoteValue,
    filesByUploadKey: Map<string, NoteUploadFile>
  ): NoteValue {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.resolveUploadedImageValue(item, filesByUploadKey)
      )
    }

    if (this.isRecord(value)) {
      return this.resolveUploadedImageValue(value, filesByUploadKey)
    }

    return value
  }

  private resolveUploadedImageValue(
    value: NoteImageValue,
    filesByUploadKey: Map<string, NoteUploadFile>
  ): NoteImageValue {
    const multipartValue = value as Record<string, unknown>

    if (typeof multipartValue.uploadKey !== 'string') {
      return value
    }

    const file = filesByUploadKey.get(multipartValue.uploadKey)

    if (!file?.buffer?.length) {
      throw new BadRequestException('Uploaded note image file is missing.')
    }

    const mimeType = file.mimetype || 'application/octet-stream'
    const fileName =
      typeof value.fileName === 'string' && value.fileName.trim().length > 0
        ? value.fileName
        : file.originalname

    return {
      altText: typeof value.altText === 'string' ? value.altText : undefined,
      dataUrl: `data:${mimeType};base64,${file.buffer.toString('base64')}`,
      fileName,
      height: typeof value.height === 'number' ? value.height : undefined,
      mimeType,
      size: file.size ?? file.buffer.length,
      width: typeof value.width === 'number' ? value.width : undefined,
    }
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

    return {
      noteTypeIds: this.resolveNoteTypeIds(query.noteTypeIds),
      sortBy,
      sortDirection,
    }
  }

  private resolveNoteTypeIds(
    noteTypeIds: ListNotesQueryDto['noteTypeIds']
  ): string[] | undefined {
    if (noteTypeIds === undefined) {
      return undefined
    }

    const rawValues = Array.isArray(noteTypeIds) ? noteTypeIds : [noteTypeIds]
    const resolvedNoteTypeIds = rawValues.flatMap((value) => {
      if (typeof value !== 'string') {
        throw new BadRequestException('Note type filters must be strings.')
      }

      return value
        .split(',')
        .map((noteTypeId) => noteTypeId.trim())
        .filter((noteTypeId) => noteTypeId.length > 0)
    })

    if (resolvedNoteTypeIds.length === 0) {
      throw new BadRequestException(
        'Note type filters must include at least one id.'
      )
    }

    return resolvedNoteTypeIds
  }

  private normalizeSortDirection(
    sortDirection: NoteSortDirectionEnum
  ): NoteSortDirectionEnum {
    return String(sortDirection).toLowerCase() as NoteSortDirectionEnum
  }
}
