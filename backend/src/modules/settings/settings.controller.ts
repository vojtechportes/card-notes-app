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
import { SettingsService } from './settings.service'
import { ColumnDeleteModeEnum } from './types/column-delete-mode-enum'
import { ColumnTypeEnum } from './types/column-type-enum'
import { ColumnDto } from './types/column.dto'
import { CreateColumnDto } from './types/create-column.dto'
import { CreateNoteTypeDto } from './types/create-note-type.dto'
import { DeleteColumnQueryDto } from './types/delete-column-query.dto'
import { DeleteNoteTypeDto } from './types/delete-note-type.dto'
import { DeleteNoteTypeModeEnum } from './types/delete-note-type-mode-enum'
import { DeleteNoteTypeResultDto } from './types/delete-note-type-result.dto'
import { GeneralSettingsDto } from './types/general-settings.dto'
import { NoteTypeDetailDto } from './types/note-type-detail.dto'
import { NoteTypeDto } from './types/note-type.dto'
import type { CreateColumnInput, UpdateColumnInput } from './types/note-column'
import { ReorderColumnsDto } from './types/reorder-columns.dto'
import { UpdateColumnDto } from './types/update-column.dto'
import { UpdateGeneralSettingsDto } from './types/update-general-settings.dto'
import { UpdateNoteTypeDto } from './types/update-note-type.dto'

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(SettingsService) private readonly settingsService: SettingsService
  ) {}

  @Get('note-types')
  @ApiOperation({ summary: 'List note types' })
  @ApiOkResponse({
    description: 'Configured note types.',
    type: NoteTypeDto,
    isArray: true,
  })
  listNoteTypes(): NoteTypeDto[] {
    return this.settingsService.listNoteTypes()
  }

  @Get('note-types/:id')
  @ApiOperation({ summary: 'Get one note type with its scoped columns' })
  @ApiParam({ name: 'id', description: 'Note type id.' })
  @ApiOkResponse({ description: 'Note type detail.', type: NoteTypeDetailDto })
  getNoteType(@Param('id') id: string): NoteTypeDetailDto {
    return {
      ...this.settingsService.getNoteType(id),
      columns: this.settingsService.listColumns(id),
    }
  }

  @Post('note-types')
  @ApiOperation({ summary: 'Create a note type' })
  @ApiCreatedResponse({ description: 'Created note type.', type: NoteTypeDto })
  createNoteType(@Body() body: CreateNoteTypeDto): NoteTypeDto {
    this.ensureRequestBodyIsRecord(
      body,
      'Note type request body must be an object.'
    )
    this.ensureRequiredString(body.title, 'Note type title')

    return this.settingsService.createNoteType({
      title: body.title,
    })
  }

  @Patch('note-types/:id')
  @ApiOperation({ summary: 'Update a note type' })
  @ApiParam({ name: 'id', description: 'Note type id.' })
  @ApiOkResponse({ description: 'Updated note type.', type: NoteTypeDto })
  updateNoteType(
    @Param('id') id: string,
    @Body() body: UpdateNoteTypeDto
  ): NoteTypeDto {
    this.ensureRequestBodyIsRecord(
      body,
      'Note type request body must be an object.'
    )
    this.ensureRequiredString(body.title, 'Note type title')

    return this.settingsService.updateNoteType(id, {
      title: body.title,
    })
  }

  @Delete('note-types/:id')
  @ApiOperation({ summary: 'Delete a note type' })
  @ApiParam({ name: 'id', description: 'Note type id.' })
  @ApiOkResponse({
    description: 'Note type deletion result.',
    type: DeleteNoteTypeResultDto,
  })
  deleteNoteType(
    @Param('id') id: string,
    @Body() body: DeleteNoteTypeDto
  ): DeleteNoteTypeResultDto {
    this.ensureRequestBodyIsRecord(
      body,
      'Note type delete body must be an object.'
    )
    this.ensureValidDeleteNoteTypeMode(body.mode)
    this.ensureOptionalString(body.targetNoteTypeId, 'Target note type id')

    if (body.createTargetNoteType !== undefined) {
      this.ensureRequestBodyIsRecord(
        body.createTargetNoteType,
        'createTargetNoteType must be an object.'
      )
      this.ensureRequiredString(
        body.createTargetNoteType.title,
        'Replacement note type title'
      )
    }

    if (body.fieldMappings !== undefined) {
      if (!Array.isArray(body.fieldMappings)) {
        throw new BadRequestException('fieldMappings must be an array.')
      }

      for (const fieldMapping of body.fieldMappings) {
        this.ensureRequestBodyIsRecord(
          fieldMapping,
          'Each field mapping must be an object.'
        )
        this.ensureRequiredString(fieldMapping.sourceColumnId, 'Source column id')
        this.ensureRequiredString(fieldMapping.targetColumnId, 'Target column id')
      }
    }

    return this.settingsService.deleteNoteType(id, {
      createTargetNoteType: body.createTargetNoteType,
      fieldMappings: body.fieldMappings,
      mode: body.mode,
      targetNoteTypeId: body.targetNoteTypeId,
    })
  }

  @Get('note-types/:noteTypeId/columns')
  @ApiOperation({ summary: 'List note columns for one note type' })
  @ApiParam({ name: 'noteTypeId', description: 'Owning note type id.' })
  @ApiOkResponse({
    description: 'Configured columns for one note type.',
    type: ColumnDto,
    isArray: true,
  })
  listColumns(@Param('noteTypeId') noteTypeId: string): ColumnDto[] {
    return this.settingsService.listColumns(noteTypeId)
  }

  @Post('note-types/:noteTypeId/columns')
  @ApiOperation({ summary: 'Create a note column under one note type' })
  @ApiParam({ name: 'noteTypeId', description: 'Owning note type id.' })
  @ApiCreatedResponse({ description: 'Created column.', type: ColumnDto })
  createColumn(
    @Param('noteTypeId') noteTypeId: string,
    @Body() body: CreateColumnDto
  ): ColumnDto {
    return this.settingsService.createColumn(
      noteTypeId,
      this.resolveCreateColumnInput(body)
    )
  }

  @Patch('note-types/:noteTypeId/columns/order')
  @ApiOperation({ summary: 'Reorder columns within one note type' })
  @ApiParam({ name: 'noteTypeId', description: 'Owning note type id.' })
  @ApiOkResponse({
    description: 'Reordered note columns.',
    type: ColumnDto,
    isArray: true,
  })
  reorderColumns(
    @Param('noteTypeId') noteTypeId: string,
    @Body() body: ReorderColumnsDto
  ): ColumnDto[] {
    return this.settingsService.reorderColumns(
      noteTypeId,
      this.resolveColumnIds(body)
    )
  }

  @Patch('note-types/:noteTypeId/columns/:id')
  @ApiOperation({ summary: 'Update a note column under one note type' })
  @ApiParam({ name: 'noteTypeId', description: 'Owning note type id.' })
  @ApiParam({ name: 'id', description: 'Column id.' })
  @ApiOkResponse({ description: 'Updated column.', type: ColumnDto })
  updateColumn(
    @Param('noteTypeId') noteTypeId: string,
    @Param('id') id: string,
    @Body() body: UpdateColumnDto
  ): ColumnDto {
    return this.settingsService.updateColumn(
      noteTypeId,
      id,
      this.resolveUpdateColumnInput(body)
    )
  }

  @Delete('note-types/:noteTypeId/columns/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a note column under one note type' })
  @ApiParam({ name: 'noteTypeId', description: 'Owning note type id.' })
  @ApiParam({ name: 'id', description: 'Column id.' })
  @ApiNoContentResponse({ description: 'Column was deleted.' })
  deleteColumn(
    @Param('noteTypeId') noteTypeId: string,
    @Param('id') id: string,
    @Query() query: DeleteColumnQueryDto = {}
  ): void {
    this.settingsService.deleteColumn(noteTypeId, id, {
      deleteNoteData: this.resolveDeleteNoteData(query),
    })
  }

  @Get('general')
  @ApiOperation({ summary: 'Get general settings' })
  @ApiOkResponse({ description: 'General settings.', type: GeneralSettingsDto })
  getGeneralSettings(): GeneralSettingsDto {
    return this.settingsService.getGeneralSettings()
  }

  @Patch('general')
  @ApiOperation({ summary: 'Update general settings' })
  @ApiOkResponse({
    description: 'Updated general settings.',
    type: GeneralSettingsDto,
  })
  updateGeneralSettings(
    @Body() body: UpdateGeneralSettingsDto
  ): GeneralSettingsDto {
    this.ensureRequestBodyIsRecord(
      body,
      'General settings request body must be an object.'
    )
    this.ensureOptionalNumberOrNull(
      body.textTruncationLength,
      'Text truncation length'
    )
    this.ensureOptionalNumberOrNull(
      body.cardFieldDisplayCount,
      'Card field display count'
    )

    return this.settingsService.updateGeneralSettings(body)
  }

  private resolveCreateColumnInput(body: CreateColumnDto): CreateColumnInput {
    this.ensureRequestBodyIsRecord(
      body,
      'Column request body must be an object.'
    )
    this.ensureRequiredString(body.name, 'Column name')
    this.ensureRequiredString(body.title, 'Column title')
    this.ensureValidColumnType(body.type)
    this.ensureOptionalInteger(body.sortOrder, 'Column sort order')
    this.ensureOptionalBoolean(body.isHidden, 'Column hidden state')
    this.ensureOptionalRecordOrNull(body.config, 'Column config')

    return {
      name: body.name,
      title: body.title,
      type: body.type,
      sortOrder: body.sortOrder,
      isHidden: body.isHidden,
      config: body.config,
    }
  }

  private resolveUpdateColumnInput(body: UpdateColumnDto): UpdateColumnInput {
    const updateColumnInput = body

    this.ensureRequestBodyIsRecord(
      body,
      'Column request body must be an object.'
    )
    this.ensureOptionalString(updateColumnInput.name, 'Column name')
    this.ensureOptionalString(updateColumnInput.title, 'Column title')

    if (updateColumnInput.type !== undefined) {
      this.ensureValidColumnType(updateColumnInput.type)
    }

    this.ensureOptionalInteger(updateColumnInput.sortOrder, 'Column sort order')
    this.ensureOptionalBoolean(
      updateColumnInput.isHidden,
      'Column hidden state'
    )
    this.ensureOptionalRecordOrNull(updateColumnInput.config, 'Column config')

    return {
      name: updateColumnInput.name,
      title: updateColumnInput.title,
      type: updateColumnInput.type,
      sortOrder: updateColumnInput.sortOrder,
      isHidden: updateColumnInput.isHidden,
      config: updateColumnInput.config,
    }
  }

  private resolveColumnIds(body: ReorderColumnsDto): string[] {
    this.ensureRequestBodyIsRecord(
      body,
      'Column reorder request body must be an object.'
    )

    if (
      !Array.isArray(body.columnIds) ||
      body.columnIds.some((id) => typeof id !== 'string')
    ) {
      throw new BadRequestException(
        'Column reorder body must include columnIds as an array of strings.'
      )
    }

    return body.columnIds
  }

  private resolveDeleteNoteData(query: DeleteColumnQueryDto): boolean {
    const deleteMode = query.deleteMode ?? ColumnDeleteModeEnum.DefinitionOnly

    if (!Object.values(ColumnDeleteModeEnum).includes(deleteMode)) {
      throw new BadRequestException('Column delete mode is not supported.')
    }

    return deleteMode === ColumnDeleteModeEnum.DefinitionAndValues
  }

  private ensureRequestBodyIsRecord(
    body: unknown,
    message: string
  ): asserts body is Record<string, unknown> {
    if (!this.isRecord(body)) {
      throw new BadRequestException(message)
    }
  }

  private ensureRequiredString(value: unknown, label: string): void {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${label} must be a string.`)
    }
  }

  private ensureOptionalString(value: unknown, label: string): void {
    if (value !== undefined && typeof value !== 'string') {
      throw new BadRequestException(`${label} must be a string.`)
    }
  }

  private ensureValidDeleteNoteTypeMode(value: unknown): void {
    if (
      !Object.values(DeleteNoteTypeModeEnum).includes(
        value as DeleteNoteTypeModeEnum
      )
    ) {
      throw new BadRequestException('Note type delete mode is not supported.')
    }
  }

  private ensureValidColumnType(value: unknown): void {
    if (!Object.values(ColumnTypeEnum).includes(value as ColumnTypeEnum)) {
      throw new BadRequestException('Column type is not supported.')
    }
  }

  private ensureOptionalInteger(value: unknown, label: string): void {
    if (value !== undefined && !Number.isInteger(value)) {
      throw new BadRequestException(`${label} must be an integer.`)
    }
  }

  private ensureOptionalBoolean(value: unknown, label: string): void {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new BadRequestException(`${label} must be a boolean.`)
    }
  }

  private ensureOptionalNumberOrNull(value: unknown, label: string): void {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      throw new BadRequestException(`${label} must be a number or null.`)
    }
  }

  private ensureOptionalRecordOrNull(value: unknown, label: string): void {
    if (value !== undefined && value !== null && !this.isRecord(value)) {
      throw new BadRequestException(`${label} must be an object or null.`)
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
