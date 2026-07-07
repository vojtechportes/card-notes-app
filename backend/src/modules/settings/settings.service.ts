import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuidV4 } from 'uuid';
import { ColumnsRepository } from './columns.repository';
import { defaultNoteColumns } from './constants/default-note-columns';
import { GeneralSettingsRepository } from './general-settings.repository';
import { ColumnTypeEnum } from './types/column-type-enum';
import type { GeneralSettings, UpdateGeneralSettingsInput } from './types/general-settings';
import type { CreateColumnInput, NoteColumn, UpdateColumnInput } from './types/note-column';

interface DeleteColumnOptions {
  deleteNoteData?: boolean;
}

const textTruncationLengthSettingKey = 'textTruncationLength';
const cardFieldDisplayCountSettingKey = 'cardFieldDisplayCount';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    private readonly columnsRepository: ColumnsRepository,
    private readonly generalSettingsRepository: GeneralSettingsRepository,
  ) {}

  onModuleInit(): void {
    this.columnsRepository.ensureDefaultColumns(defaultNoteColumns);
  }

  listColumns(): NoteColumn[] {
    return this.columnsRepository.findAll();
  }

  createColumn(input: CreateColumnInput): NoteColumn {
    const name = this.normalizeName(input.name);
    const title = this.normalizeTitle(input.title);

    this.ensureValidColumnType(input.type);
    this.ensureValidSortOrder(input.sortOrder);
    this.ensureColumnNameIsAvailable(name);

    return this.columnsRepository.create({
      id: uuidV4(),
      name,
      title,
      type: input.type,
      sortOrder: input.sortOrder ?? this.columnsRepository.getNextSortOrder(),
      isHidden: input.isHidden ?? false,
      isDefault: false,
      config: input.config ?? null,
    });
  }

  updateColumn(id: string, input: UpdateColumnInput): NoteColumn {
    const existingColumn = this.getColumnOrThrow(id);
    const name = input.name === undefined ? existingColumn.name : this.normalizeName(input.name);
    const title = input.title === undefined ? existingColumn.title : this.normalizeTitle(input.title);
    const type = input.type ?? existingColumn.type;
    const sortOrder = input.sortOrder ?? existingColumn.sortOrder;

    this.ensureDefaultColumnIdentityIsPreserved(existingColumn, name, type);
    this.ensureValidColumnType(type);
    this.ensureValidSortOrder(sortOrder);
    this.ensureColumnNameIsAvailable(name, id);

    return this.columnsRepository.update({
      ...existingColumn,
      name,
      title,
      type,
      sortOrder,
      isHidden: input.isHidden ?? existingColumn.isHidden,
      config: input.config === undefined ? existingColumn.config : input.config,
    });
  }

  reorderColumns(columnIds: string[]): NoteColumn[] {
    const columns = this.columnsRepository.findAll();
    const existingIds = new Set(columns.map((column) => column.id));
    const requestedIds = new Set(columnIds);

    if (columnIds.length !== requestedIds.size) {
      throw new BadRequestException('Column order cannot contain duplicate ids.');
    }

    if (columns.length !== columnIds.length || columnIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException('Column order must include every existing column exactly once.');
    }

    this.columnsRepository.updateSortOrders(columnIds);

    return this.columnsRepository.findAll();
  }

  deleteColumn(id: string, options: DeleteColumnOptions = {}): void {
    const column = this.getColumnOrThrow(id);

    if (column.isDefault) {
      throw new BadRequestException('Default columns cannot be deleted.');
    }

    this.columnsRepository.delete(id, { deleteNoteData: options.deleteNoteData ?? false });
  }

  getGeneralSettings(): GeneralSettings {
    return {
      textTruncationLength: this.generalSettingsRepository.findValue<number | null>(textTruncationLengthSettingKey) ?? null,
      cardFieldDisplayCount: this.generalSettingsRepository.findValue<number | null>(cardFieldDisplayCountSettingKey) ?? null,
    };
  }

  updateGeneralSettings(input: UpdateGeneralSettingsInput): GeneralSettings {
    if (input.textTruncationLength !== undefined) {
      this.ensureOptionalPositiveInteger(input.textTruncationLength, 'Text truncation length');
      this.generalSettingsRepository.setValue(textTruncationLengthSettingKey, input.textTruncationLength);
    }

    if (input.cardFieldDisplayCount !== undefined) {
      this.ensureOptionalPositiveInteger(input.cardFieldDisplayCount, 'Card field display count');
      this.generalSettingsRepository.setValue(cardFieldDisplayCountSettingKey, input.cardFieldDisplayCount);
    }

    return this.getGeneralSettings();
  }

  private getColumnOrThrow(id: string): NoteColumn {
    const column = this.columnsRepository.findById(id);

    if (!column) {
      throw new NotFoundException('Column was not found.');
    }

    return column;
  }

  private ensureColumnNameIsAvailable(name: string, currentColumnId?: string): void {
    const column = this.columnsRepository.findByName(name);

    if (column && column.id !== currentColumnId) {
      throw new ConflictException('Column name must be unique.');
    }
  }

  private ensureDefaultColumnIdentityIsPreserved(column: NoteColumn, name: string, type: ColumnTypeEnum): void {
    if (!column.isDefault) {
      return;
    }

    if (column.name !== name || column.type !== type) {
      throw new BadRequestException('Default column name and type cannot be changed.');
    }
  }

  private ensureValidColumnType(type: ColumnTypeEnum): void {
    if (!Object.values(ColumnTypeEnum).includes(type)) {
      throw new BadRequestException('Column type is not supported.');
    }
  }

  private ensureValidSortOrder(sortOrder?: number): void {
    if (sortOrder === undefined) {
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new BadRequestException('Column sort order must be a non-negative integer.');
    }
  }

  private ensureOptionalPositiveInteger(value: number | null, label: string): void {
    if (value === null) {
      return;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException(`${label} must be a positive integer or null.`);
    }
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Column name is required.');
    }

    return normalizedName;
  }

  private normalizeTitle(title: string): string {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new BadRequestException('Column title is required.');
    }

    return normalizedTitle;
  }
}
