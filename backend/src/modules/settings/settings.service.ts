import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { v4 as uuidV4 } from 'uuid'
import { NotesRepository } from '../notes/notes.repository'
import type { NoteValue } from '../notes/types/note-value'
import { ColumnsRepository } from './columns.repository'
import { defaultNoteColumns } from './constants/default-note-columns'
import { GeneralSettingsRepository } from './general-settings.repository'
import { LabelsRepository } from './labels.repository'
import { NoteTypesRepository } from './note-types.repository'
import { ColumnTypeEnum } from './types/column-type-enum'
import { DeleteNoteTypeModeEnum } from './types/delete-note-type-mode-enum'
import type {
  GeneralSettings,
  UpdateGeneralSettingsInput,
} from './types/general-settings'
import type {
  CreateColumnInput,
  NoteColumn,
  UpdateColumnInput,
} from './types/note-column'
import type { NoteType } from './types/note-type'
import type { LabelsColumnConfig } from './types/labels-column-config'
import { areColumnTypesCompatible } from './utils/are-column-types-compatible.util'
import { filterLabelIdsForColumn } from './utils/filter-label-ids-for-column.util'
import { resolveLabelsColumnConfig } from './utils/resolve-labels-column-config.util'

interface DeleteColumnOptions {
  deleteNoteData?: boolean
}

interface DeleteNoteTypeInput {
  createTargetNoteType?: {
    title: string
  }
  fieldMappings?: Array<{
    sourceColumnId: string
    targetColumnId: string
  }>
  mode: DeleteNoteTypeModeEnum
  targetNoteTypeId?: string
}

interface DeleteNoteTypeResult {
  deletedNoteTypeId: string
  deletedNotesCount: number
  movedNotesCount: number
  targetNoteTypeId?: string
}

const textTruncationLengthSettingKey = 'textTruncationLength'
const cardFieldDisplayCountSettingKey = 'cardFieldDisplayCount'
const mergeDateTimeFieldsSettingKey = 'mergeDateTimeFields'

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @Inject(ColumnsRepository)
    private readonly columnsRepository: ColumnsRepository,
    @Inject(GeneralSettingsRepository)
    private readonly generalSettingsRepository: GeneralSettingsRepository,
    @Inject(NoteTypesRepository)
    private readonly noteTypesRepository?: NoteTypesRepository,
    @Inject(NotesRepository)
    private readonly notesRepository?: NotesRepository,
    @Inject(LabelsRepository)
    private readonly labelsRepository?: LabelsRepository
  ) {}

  onModuleInit(): void {
    this.seedDefaultColumnsForAllNoteTypes()
  }

  listNoteTypes(): NoteType[] {
    return this.getNoteTypesRepository().findAll()
  }

  getNoteType(id: string): NoteType {
    return this.getNoteTypeOrThrow(id)
  }

  createNoteType(input: { title: string }): NoteType {
    const title = this.normalizeNoteTypeTitle(input.title)

    this.ensureNoteTypeTitleIsAvailable(title)

    const noteType = this.getNoteTypesRepository().create({
      id: uuidV4(),
      title,
    })

    this.seedDefaultColumns(noteType.id)

    return noteType
  }

  updateNoteType(id: string, input: { title: string }): NoteType {
    this.getNoteTypeOrThrow(id)

    const title = this.normalizeNoteTypeTitle(input.title)

    this.ensureNoteTypeTitleIsAvailable(title, id)

    return this.getNoteTypesRepository().updateTitle(id, title)
  }

  deleteNoteType(id: string, input: DeleteNoteTypeInput): DeleteNoteTypeResult {
    const noteType = this.getNoteTypeOrThrow(id)
    const noteTypeCountBeforeDelete = this.getNoteTypesRepository().count()

    if (input.mode === DeleteNoteTypeModeEnum.DeleteNotes) {
      return this.columnsRepository
        .getDatabaseService()
        .getConnection()
        .transaction(() => {
          const deletedNotesCount =
            this.getNotesRepository().deleteByNoteTypeId(id)

          this.getLabelsRepository().deleteByNoteTypeIdWithValueCleanup(id)
          this.getNoteTypesRepository().delete(id)

          if (noteTypeCountBeforeDelete === 1) {
            this.seedDefaultColumnsForAllNoteTypes()
          }

          return {
            deletedNoteTypeId: noteType.id,
            deletedNotesCount,
            movedNotesCount: 0,
          }
        })()
    }

    return this.columnsRepository
      .getDatabaseService()
      .getConnection()
      .transaction(() => {
        const targetNoteType = this.resolveMoveTargetNoteType(
          noteType.id,
          input
        )
        const sourceColumns = this.listColumns(noteType.id)
        const targetColumns = this.listColumns(targetNoteType.id)
        const fieldMappings = this.resolveFieldMappings(
          sourceColumns,
          targetColumns,
          input.fieldMappings ?? []
        )
        const movedNotesCount = this.getNotesRepository().moveNotesToType({
          fieldMappings,
          sourceColumnIds: sourceColumns.map((column) => column.id),
          sourceNoteTypeId: noteType.id,
          targetNoteTypeId: targetNoteType.id,
          timestamp: this.createTimestamp(),
        })

        this.getLabelsRepository().deleteByNoteTypeIdWithValueCleanup(
          noteType.id
        )
        this.getNoteTypesRepository().delete(noteType.id)

        return {
          deletedNoteTypeId: noteType.id,
          deletedNotesCount: 0,
          movedNotesCount,
          targetNoteTypeId: targetNoteType.id,
        }
      })()
  }

  deleteLabel(id: string): boolean {
    return this.getLabelsRepository().deleteWithValueCleanup(id)
  }

  listColumns(noteTypeId = this.getDefaultNoteTypeId()): NoteColumn[] {
    this.getNoteTypeOrThrow(noteTypeId)

    return this.columnsRepository.findAll(noteTypeId)
  }

  createColumn(
    noteTypeIdOrInput: string | CreateColumnInput,
    maybeInput?: CreateColumnInput
  ): NoteColumn {
    const noteTypeId =
      typeof noteTypeIdOrInput === 'string'
        ? noteTypeIdOrInput
        : this.getDefaultNoteTypeId()
    const input =
      typeof noteTypeIdOrInput === 'string'
        ? (maybeInput as CreateColumnInput)
        : noteTypeIdOrInput

    this.getNoteTypeOrThrow(noteTypeId)

    const name = this.normalizeName(input.name)
    const title = this.normalizeTitle(input.title)

    this.ensureValidColumnType(input.type)
    this.ensureValidSortOrder(input.sortOrder)
    this.ensureColumnNameIsAvailable(name, noteTypeId)
    const config = this.normalizeColumnConfig(input.type, input.config)

    return this.columnsRepository.create({
      id: uuidV4(),
      noteTypeId,
      name,
      title,
      type: input.type,
      sortOrder:
        input.sortOrder ?? this.columnsRepository.getNextSortOrder(noteTypeId),
      isHidden: input.isHidden ?? false,
      isDefault: false,
      config,
    })
  }

  updateColumn(
    noteTypeIdOrId: string,
    idOrInput: string | UpdateColumnInput,
    maybeInput?: UpdateColumnInput
  ): NoteColumn {
    const noteTypeId =
      typeof idOrInput === 'string'
        ? noteTypeIdOrId
        : this.getDefaultNoteTypeId()
    const id = typeof idOrInput === 'string' ? idOrInput : noteTypeIdOrId
    const input =
      typeof idOrInput === 'string'
        ? (maybeInput as UpdateColumnInput)
        : idOrInput
    const existingColumn = this.getColumnOrThrow(noteTypeId, id)
    const name =
      input.name === undefined
        ? existingColumn.name
        : this.normalizeName(input.name)
    const title =
      input.title === undefined
        ? existingColumn.title
        : this.normalizeTitle(input.title)
    const type = input.type ?? existingColumn.type
    const sortOrder = input.sortOrder ?? existingColumn.sortOrder

    this.ensureDefaultColumnIdentityIsPreserved(existingColumn, name, type)
    this.ensureValidColumnType(type)
    this.ensureValidSortOrder(sortOrder)
    this.ensureColumnNameIsAvailable(name, existingColumn.noteTypeId, id)
    const config = this.resolveUpdatedColumnConfig(
      existingColumn,
      type,
      input.config
    )

    return this.columnsRepository.update({
      ...existingColumn,
      name,
      title,
      type,
      sortOrder,
      isHidden: input.isHidden ?? existingColumn.isHidden,
      config,
    })
  }

  getLabelsColumnConfig(column: NoteColumn): LabelsColumnConfig {
    if (column.type !== ColumnTypeEnum.Labels) {
      throw new BadRequestException('Column is not a labels column.')
    }

    return resolveLabelsColumnConfig(column.config, (noteTypeId) =>
      Boolean(this.getNoteTypesRepository().findById(noteTypeId))
    )
  }

  reorderColumns(
    noteTypeIdOrColumnIds: string | string[],
    maybeColumnIds?: string[]
  ): NoteColumn[] {
    const noteTypeId = Array.isArray(noteTypeIdOrColumnIds)
      ? this.getDefaultNoteTypeId()
      : noteTypeIdOrColumnIds
    const columnIds = Array.isArray(noteTypeIdOrColumnIds)
      ? noteTypeIdOrColumnIds
      : (maybeColumnIds as string[])
    const columns = this.listColumns(noteTypeId)
    const existingIds = new Set(columns.map((column) => column.id))
    const requestedIds = new Set(columnIds)

    if (columnIds.length !== requestedIds.size) {
      throw new BadRequestException(
        'Column order cannot contain duplicate ids.'
      )
    }

    if (
      columns.length !== columnIds.length ||
      columnIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'Column order must include every existing column exactly once.'
      )
    }

    this.columnsRepository.updateSortOrders(columnIds)

    return this.listColumns(noteTypeId)
  }

  deleteColumn(
    noteTypeIdOrId: string,
    idOrOptions?: string | DeleteColumnOptions,
    maybeOptions: DeleteColumnOptions = {}
  ): void {
    const noteTypeId =
      typeof idOrOptions === 'string'
        ? noteTypeIdOrId
        : this.getDefaultNoteTypeId()
    const id = typeof idOrOptions === 'string' ? idOrOptions : noteTypeIdOrId
    const options =
      typeof idOrOptions === 'string' ? maybeOptions : (idOrOptions ?? {})
    const column = this.getColumnOrThrow(noteTypeId, id)

    if (column.isDefault) {
      throw new BadRequestException('Default columns cannot be deleted.')
    }

    this.columnsRepository.delete(id, {
      deleteNoteData: options.deleteNoteData ?? false,
    })
  }

  getDefaultNoteType(): NoteType {
    const noteType = this.getNoteTypesRepository().findPreferred()

    if (!noteType) {
      throw new NotFoundException('Default note type was not found.')
    }

    return noteType
  }

  getGeneralSettings(): GeneralSettings {
    return {
      textTruncationLength:
        this.generalSettingsRepository.findValue<number | null>(
          textTruncationLengthSettingKey
        ) ?? null,
      cardFieldDisplayCount:
        this.generalSettingsRepository.findValue<number | null>(
          cardFieldDisplayCountSettingKey
        ) ?? null,
      mergeDateTimeFields:
        this.generalSettingsRepository.findValue<boolean | null>(
          mergeDateTimeFieldsSettingKey
        ) ?? null,
    }
  }

  updateGeneralSettings(input: UpdateGeneralSettingsInput): GeneralSettings {
    if (input.textTruncationLength !== undefined) {
      this.ensureOptionalPositiveInteger(
        input.textTruncationLength,
        'Text truncation length'
      )
      this.generalSettingsRepository.setValue(
        textTruncationLengthSettingKey,
        input.textTruncationLength
      )
    }

    if (input.cardFieldDisplayCount !== undefined) {
      this.ensureOptionalPositiveInteger(
        input.cardFieldDisplayCount,
        'Card field display count'
      )
      this.generalSettingsRepository.setValue(
        cardFieldDisplayCountSettingKey,
        input.cardFieldDisplayCount
      )
    }

    if (input.mergeDateTimeFields !== undefined) {
      this.ensureOptionalBooleanOrNull(
        input.mergeDateTimeFields,
        'Merge date and time fields'
      )
      this.generalSettingsRepository.setValue(
        mergeDateTimeFieldsSettingKey,
        input.mergeDateTimeFields
      )
    }

    return this.getGeneralSettings()
  }

  private normalizeColumnConfig(
    type: ColumnTypeEnum,
    config: Record<string, unknown> | null | undefined
  ): Record<string, unknown> | null {
    if (type === ColumnTypeEnum.Labels) {
      return resolveLabelsColumnConfig(config, (noteTypeId) =>
        Boolean(this.getNoteTypesRepository().findById(noteTypeId))
      ) as unknown as Record<string, unknown>
    }

    if (
      config &&
      (Object.prototype.hasOwnProperty.call(config, 'allowMultiple') ||
        Object.prototype.hasOwnProperty.call(config, 'sources'))
    ) {
      throw new BadRequestException(
        'Labels column config can only be used by labels columns.'
      )
    }

    return config ?? null
  }

  private resolveUpdatedColumnConfig(
    existingColumn: NoteColumn,
    type: ColumnTypeEnum,
    requestedConfig: Record<string, unknown> | null | undefined
  ): Record<string, unknown> | null {
    const configInput =
      requestedConfig === undefined
        ? existingColumn.type === ColumnTypeEnum.Labels &&
          type !== ColumnTypeEnum.Labels
          ? null
          : existingColumn.config
        : requestedConfig
    const config = this.normalizeColumnConfig(type, configInput)

    if (
      existingColumn.type === ColumnTypeEnum.Labels &&
      type === ColumnTypeEnum.Labels
    ) {
      const previousConfig = this.getLabelsColumnConfig(existingColumn)
      const nextConfig = config as unknown as LabelsColumnConfig

      if (
        previousConfig.allowMultiple &&
        !nextConfig.allowMultiple &&
        this.getNotesRepository().hasMultipleLabelValuesForColumn(
          existingColumn.id
        )
      ) {
        throw new BadRequestException(
          'Labels column cannot be changed to single selection while notes have multiple labels.'
        )
      }
    }

    return config
  }

  private seedDefaultColumnsForAllNoteTypes(): void {
    this.getNoteTypesRepository().ensureDefaultExists()

    for (const noteType of this.getNoteTypesRepository().findAll()) {
      this.seedDefaultColumns(noteType.id)
    }
  }

  private seedDefaultColumns(noteTypeId: string): void {
    this.columnsRepository.ensureDefaultColumns(noteTypeId, defaultNoteColumns)
  }

  private resolveMoveTargetNoteType(
    sourceNoteTypeId: string,
    input: DeleteNoteTypeInput
  ): NoteType {
    if (
      input.targetNoteTypeId !== undefined &&
      input.createTargetNoteType !== undefined
    ) {
      throw new BadRequestException(
        'Provide either targetNoteTypeId or createTargetNoteType, but not both.'
      )
    }

    if (input.createTargetNoteType) {
      return this.createNoteType({
        title: input.createTargetNoteType.title,
      })
    }

    if (!input.targetNoteTypeId) {
      throw new BadRequestException(
        'targetNoteTypeId or createTargetNoteType is required when moving notes.'
      )
    }

    if (input.targetNoteTypeId === sourceNoteTypeId) {
      throw new BadRequestException(
        'Notes cannot be moved to the same note type being deleted.'
      )
    }

    return this.getNoteTypeOrThrow(input.targetNoteTypeId)
  }

  private resolveFieldMappings(
    sourceColumns: NoteColumn[],
    targetColumns: NoteColumn[],
    fieldMappings: Array<{
      sourceColumnId: string
      targetColumnId: string
    }>
  ): Array<{
    sourceColumnId: string
    targetColumnId: string
    transformValue?: (value: NoteValue) => NoteValue
  }> {
    const sourceColumnsById = new Map(
      sourceColumns.map((column) => [column.id, column])
    )
    const targetColumnsById = new Map(
      targetColumns.map((column) => [column.id, column])
    )
    const sourceColumnIds = new Set<string>()
    const targetColumnIds = new Set<string>()
    const labels = this.getLabelsRepository().findAll()
    const resolvedFieldMappings: Array<{
      sourceColumnId: string
      targetColumnId: string
      transformValue?: (value: NoteValue) => NoteValue
    }> = []

    for (const fieldMapping of fieldMappings) {
      const sourceColumn = sourceColumnsById.get(fieldMapping.sourceColumnId)
      const targetColumn = targetColumnsById.get(fieldMapping.targetColumnId)

      if (!sourceColumn) {
        throw new BadRequestException(
          'Field mapping source column does not belong to the deleted note type.'
        )
      }

      if (!targetColumn) {
        throw new BadRequestException(
          'Field mapping target column does not belong to the target note type.'
        )
      }

      if (sourceColumnIds.has(sourceColumn.id)) {
        throw new BadRequestException(
          'Field mappings cannot repeat the same source column.'
        )
      }

      if (targetColumnIds.has(targetColumn.id)) {
        throw new BadRequestException(
          'Field mappings cannot repeat the same target column.'
        )
      }

      if (
        this.isSystemTimestampColumn(sourceColumn) ||
        this.isSystemTimestampColumn(targetColumn)
      ) {
        throw new BadRequestException(
          'System timestamp columns cannot participate in field mappings.'
        )
      }

      if (!areColumnTypesCompatible(sourceColumn.type, targetColumn.type)) {
        throw new BadRequestException(
          'Field mapping column types are not compatible.'
        )
      }

      sourceColumnIds.add(sourceColumn.id)
      targetColumnIds.add(targetColumn.id)

      if (
        sourceColumn.type === ColumnTypeEnum.Labels &&
        targetColumn.type === ColumnTypeEnum.Labels
      ) {
        const targetConfig = this.getLabelsColumnConfig(targetColumn)

        resolvedFieldMappings.push({
          ...fieldMapping,
          transformValue: (value) =>
            filterLabelIdsForColumn(value, targetConfig, labels),
        })
      } else {
        resolvedFieldMappings.push(fieldMapping)
      }
    }

    return resolvedFieldMappings
  }
  private isSystemTimestampColumn(column: NoteColumn): boolean {
    return (
      column.isDefault &&
      (column.name === 'createdAt' || column.name === 'updatedAt')
    )
  }

  private getColumnOrThrow(noteTypeId: string, id: string): NoteColumn {
    this.getNoteTypeOrThrow(noteTypeId)

    const column = this.columnsRepository.findById(id)

    if (!column || column.noteTypeId !== noteTypeId) {
      throw new NotFoundException('Column was not found.')
    }

    return column
  }

  private getDefaultNoteTypeId(): string {
    return this.getDefaultNoteType().id
  }

  private getNoteTypeOrThrow(id: string): NoteType {
    const noteType = this.getNoteTypesRepository().findById(id)

    if (!noteType) {
      throw new NotFoundException('Note type was not found.')
    }

    return noteType
  }

  private getNoteTypesRepository(): NoteTypesRepository {
    return (
      this.noteTypesRepository ??
      new NoteTypesRepository(this.columnsRepository.getDatabaseService())
    )
  }

  private getLabelsRepository(): LabelsRepository {
    return (
      this.labelsRepository ??
      new LabelsRepository(this.columnsRepository.getDatabaseService())
    )
  }

  private getNotesRepository(): NotesRepository {
    return (
      this.notesRepository ??
      new NotesRepository(this.columnsRepository.getDatabaseService())
    )
  }

  private ensureNoteTypeTitleIsAvailable(
    title: string,
    currentNoteTypeId?: string
  ): void {
    const noteType = this.getNoteTypesRepository().findByTitle(title)

    if (noteType && noteType.id !== currentNoteTypeId) {
      throw new ConflictException('Note type title must be unique.')
    }
  }

  private ensureColumnNameIsAvailable(
    name: string,
    noteTypeId: string,
    currentColumnId?: string
  ): void {
    const column = this.columnsRepository.findByName(name, noteTypeId)

    if (column && column.id !== currentColumnId) {
      throw new ConflictException('Column name must be unique.')
    }
  }

  private ensureDefaultColumnIdentityIsPreserved(
    column: NoteColumn,
    name: string,
    type: ColumnTypeEnum
  ): void {
    if (!column.isDefault) {
      return
    }

    if (column.name !== name || column.type !== type) {
      throw new BadRequestException(
        'Default column name and type cannot be changed.'
      )
    }
  }

  private ensureValidColumnType(type: ColumnTypeEnum): void {
    if (!Object.values(ColumnTypeEnum).includes(type)) {
      throw new BadRequestException('Column type is not supported.')
    }
  }

  private ensureValidSortOrder(sortOrder?: number): void {
    if (sortOrder === undefined) {
      return
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new BadRequestException(
        'Column sort order must be a non-negative integer.'
      )
    }
  }

  private ensureOptionalPositiveInteger(
    value: number | null,
    label: string
  ): void {
    if (value === null) {
      return
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException(
        `${label} must be a positive integer or null.`
      )
    }
  }

  private ensureOptionalBooleanOrNull(
    value: unknown,
    label: string
  ): asserts value is boolean | null | undefined {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${label} must be a boolean or null.`)
    }
  }

  private normalizeNoteTypeTitle(title: string): string {
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      throw new BadRequestException('Note type title is required.')
    }

    return normalizedTitle
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim()

    if (!normalizedName) {
      throw new BadRequestException('Column name is required.')
    }

    return normalizedName
  }

  private normalizeTitle(title: string): string {
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      throw new BadRequestException('Column title is required.')
    }

    return normalizedTitle
  }

  private createTimestamp(): string {
    return new Date().toISOString()
  }
}
