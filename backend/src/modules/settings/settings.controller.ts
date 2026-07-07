import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { ColumnDeleteModeEnum } from './types/column-delete-mode-enum';
import { ColumnTypeEnum } from './types/column-type-enum';
import { ColumnDto } from './types/column.dto';
import { CreateColumnDto } from './types/create-column.dto';
import { DeleteColumnQueryDto } from './types/delete-column-query.dto';
import { GeneralSettingsDto } from './types/general-settings.dto';
import type { CreateColumnInput, UpdateColumnInput } from './types/note-column';
import { ReorderColumnsDto } from './types/reorder-columns.dto';
import { UpdateColumnDto } from './types/update-column.dto';
import { UpdateGeneralSettingsDto } from './types/update-general-settings.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('columns')
  @ApiOperation({ summary: 'List note columns' })
  @ApiOkResponse({ description: 'Configured note columns.', type: ColumnDto, isArray: true })
  listColumns(): ColumnDto[] {
    return this.settingsService.listColumns();
  }

  @Post('columns')
  @ApiOperation({ summary: 'Create a note column' })
  @ApiCreatedResponse({ description: 'Created column.', type: ColumnDto })
  createColumn(@Body() body: CreateColumnDto): ColumnDto {
    return this.settingsService.createColumn(this.resolveCreateColumnInput(body));
  }

  @Patch('columns/order')
  @ApiOperation({ summary: 'Reorder all note columns' })
  @ApiOkResponse({ description: 'Reordered note columns.', type: ColumnDto, isArray: true })
  reorderColumns(@Body() body: ReorderColumnsDto): ColumnDto[] {
    return this.settingsService.reorderColumns(this.resolveColumnIds(body));
  }

  @Patch('columns/:id')
  @ApiOperation({ summary: 'Update a note column' })
  @ApiParam({ name: 'id', description: 'Column id.' })
  @ApiOkResponse({ description: 'Updated column.', type: ColumnDto })
  updateColumn(@Param('id') id: string, @Body() body: UpdateColumnDto): ColumnDto {
    return this.settingsService.updateColumn(id, this.resolveUpdateColumnInput(body));
  }

  @Delete('columns/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a note column' })
  @ApiParam({ name: 'id', description: 'Column id.' })
  @ApiNoContentResponse({ description: 'Column was deleted.' })
  deleteColumn(@Param('id') id: string, @Query() query: DeleteColumnQueryDto = {}): void {
    this.settingsService.deleteColumn(id, { deleteNoteData: this.resolveDeleteNoteData(query) });
  }

  @Get('general')
  @ApiOperation({ summary: 'Get general settings' })
  @ApiOkResponse({ description: 'General settings.', type: GeneralSettingsDto })
  getGeneralSettings(): GeneralSettingsDto {
    return this.settingsService.getGeneralSettings();
  }

  @Patch('general')
  @ApiOperation({ summary: 'Update general settings' })
  @ApiOkResponse({ description: 'Updated general settings.', type: GeneralSettingsDto })
  updateGeneralSettings(@Body() body: UpdateGeneralSettingsDto): GeneralSettingsDto {
    this.ensureRequestBodyIsRecord(body, 'General settings request body must be an object.');
    this.ensureOptionalNumberOrNull(body.textTruncationLength, 'Text truncation length');
    this.ensureOptionalNumberOrNull(body.cardFieldDisplayCount, 'Card field display count');

    return this.settingsService.updateGeneralSettings(body);
  }

  private resolveCreateColumnInput(body: CreateColumnDto): CreateColumnInput {
    this.ensureRequestBodyIsRecord(body, 'Column request body must be an object.');
    this.ensureRequiredString(body.name, 'Column name');
    this.ensureRequiredString(body.title, 'Column title');
    this.ensureValidColumnType(body.type);
    this.ensureOptionalInteger(body.sortOrder, 'Column sort order');
    this.ensureOptionalBoolean(body.isHidden, 'Column hidden state');
    this.ensureOptionalRecordOrNull(body.config, 'Column config');

    return {
      name: body.name,
      title: body.title,
      type: body.type,
      sortOrder: body.sortOrder,
      isHidden: body.isHidden,
      config: body.config,
    };
  }

  private resolveUpdateColumnInput(body: UpdateColumnDto): UpdateColumnInput {
    const updateColumnInput = body;

    this.ensureRequestBodyIsRecord(body, 'Column request body must be an object.');
    this.ensureOptionalString(updateColumnInput.name, 'Column name');
    this.ensureOptionalString(updateColumnInput.title, 'Column title');

    if (updateColumnInput.type !== undefined) {
      this.ensureValidColumnType(updateColumnInput.type);
    }

    this.ensureOptionalInteger(updateColumnInput.sortOrder, 'Column sort order');
    this.ensureOptionalBoolean(updateColumnInput.isHidden, 'Column hidden state');
    this.ensureOptionalRecordOrNull(updateColumnInput.config, 'Column config');

    return {
      name: updateColumnInput.name,
      title: updateColumnInput.title,
      type: updateColumnInput.type,
      sortOrder: updateColumnInput.sortOrder,
      isHidden: updateColumnInput.isHidden,
      config: updateColumnInput.config,
    };
  }

  private resolveColumnIds(body: ReorderColumnsDto): string[] {
    this.ensureRequestBodyIsRecord(body, 'Column reorder request body must be an object.');

    if (!Array.isArray(body.columnIds) || body.columnIds.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('Column reorder body must include columnIds as an array of strings.');
    }

    return body.columnIds;
  }

  private resolveDeleteNoteData(query: DeleteColumnQueryDto): boolean {
    const deleteMode = query.deleteMode ?? ColumnDeleteModeEnum.DefinitionOnly;

    if (!Object.values(ColumnDeleteModeEnum).includes(deleteMode)) {
      throw new BadRequestException('Column delete mode is not supported.');
    }

    return deleteMode === ColumnDeleteModeEnum.DefinitionAndValues;
  }

  private ensureRequestBodyIsRecord(body: unknown, message: string): asserts body is Record<string, unknown> {
    if (!this.isRecord(body)) {
      throw new BadRequestException(message);
    }
  }

  private ensureRequiredString(value: unknown, label: string): void {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${label} must be a string.`);
    }
  }

  private ensureOptionalString(value: unknown, label: string): void {
    if (value !== undefined && typeof value !== 'string') {
      throw new BadRequestException(`${label} must be a string.`);
    }
  }

  private ensureValidColumnType(value: unknown): void {
    if (!Object.values(ColumnTypeEnum).includes(value as ColumnTypeEnum)) {
      throw new BadRequestException('Column type is not supported.');
    }
  }

  private ensureOptionalInteger(value: unknown, label: string): void {
    if (value !== undefined && !Number.isInteger(value)) {
      throw new BadRequestException(`${label} must be an integer.`);
    }
  }

  private ensureOptionalBoolean(value: unknown, label: string): void {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new BadRequestException(`${label} must be a boolean.`);
    }
  }

  private ensureOptionalNumberOrNull(value: unknown, label: string): void {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      throw new BadRequestException(`${label} must be a number or null.`);
    }
  }

  private ensureOptionalRecordOrNull(value: unknown, label: string): void {
    if (value !== undefined && value !== null && !this.isRecord(value)) {
      throw new BadRequestException(`${label} must be an object or null.`);
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

