import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { v4 as uuidV4 } from 'uuid'
import { SettingsService } from '../settings/settings.service'
import { ColumnTypeEnum } from '../settings/types/column-type-enum'
import { isMultiImageColumn } from '../settings/utils/is-multi-image-column.util'
import type { NoteColumn } from '../settings/types/note-column'
import { NotesRepository } from './notes.repository'
import type { ListNotesOptions } from './types/list-notes-options'
import type { CreateNoteInput, Note, UpdateNoteInput } from './types/note'
import type {
  NoteImageValue,
  NoteValue,
  NoteValuePatch,
  NoteValues,
} from './types/note-value'

@Injectable()
export class NotesService {
  constructor(
    @Inject(NotesRepository)
    private readonly notesRepository: NotesRepository,
    @Inject(SettingsService)
    private readonly settingsService: SettingsService
  ) {}

  createNote(input: CreateNoteInput): Note {
    const values = input.values ?? {}
    const noteTypeId = this.settingsService.getNoteType(input.noteTypeId).id

    this.ensureValuesAreValid(noteTypeId, values)

    return this.notesRepository.create(
      uuidV4(),
      noteTypeId,
      values,
      this.createTimestamp()
    )
  }

  listNotes(options: ListNotesOptions = {}): Note[] {
    return this.notesRepository.findAll(options)
  }

  getNote(id: string): Note {
    const note = this.notesRepository.findById(id)

    if (!note) {
      throw new NotFoundException('Note was not found.')
    }

    return note
  }

  updateNote(id: string, input: UpdateNoteInput): Note {
    const note = this.notesRepository.findById(id)

    if (!note) {
      throw new NotFoundException('Note was not found.')
    }

    const values = input.values ?? {}

    this.ensureValuePatchIsValid(note.noteTypeId, values)

    return this.notesRepository.updateValues(
      id,
      values,
      this.createTimestamp()
    ) as Note
  }

  deleteNote(id: string): void {
    const wasDeleted = this.notesRepository.delete(id)

    if (!wasDeleted) {
      throw new NotFoundException('Note was not found.')
    }
  }

  deleteAllNotes(): number {
    return this.notesRepository.deleteAll()
  }

  deleteValuesForColumn(columnId: string): number {
    return this.notesRepository.deleteValuesForColumn(columnId)
  }

  private ensureValuesAreValid(noteTypeId: string, values: NoteValues): void {
    for (const value of Object.values(values)) {
      if (value === null) {
        throw new BadRequestException(
          'Note values cannot be null when creating a note.'
        )
      }
    }

    this.ensureValuePatchIsValid(noteTypeId, values)
  }

  private ensureValuePatchIsValid(
    noteTypeId: string,
    values: NoteValuePatch
  ): void {
    const columnsById = new Map(
      this.settingsService
        .listColumns(noteTypeId)
        .map((column) => [column.id, column])
    )

    for (const [columnId, value] of Object.entries(values)) {
      const column = columnsById.get(columnId)

      if (!column) {
        throw new BadRequestException(
          'Note value column is not configured for the note type.'
        )
      }

      if (this.isSystemTimestampColumn(column)) {
        throw new BadRequestException(
          'Note timestamps are managed by the system.'
        )
      }

      if (value !== null) {
        this.ensureValueMatchesColumnType(value, column)
      }
    }
  }

  private ensureValueMatchesColumnType(
    value: NoteValue,
    column: NoteColumn
  ): void {
    switch (column.type) {
      case ColumnTypeEnum.Text:
      case ColumnTypeEnum.Link:
        if (typeof value !== 'string') {
          throw new BadRequestException(
            'Text and link note values must be strings.'
          )
        }
        return
      case ColumnTypeEnum.Date:
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          throw new BadRequestException(
            'Date note values must be valid date strings.'
          )
        }
        return
      case ColumnTypeEnum.Number:
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException(
            'Number note values must be finite numbers.'
          )
        }
        return
      case ColumnTypeEnum.Image:
        if (!this.isValidImageNoteValue(value, column)) {
          throw new BadRequestException(
            'Image note values must be image metadata objects.'
          )
        }
        return
      default:
        throw new BadRequestException('Column type is not supported.')
    }
  }

  private isValidImageNoteValue(
    value: NoteValue,
    column: NoteColumn
  ): value is NoteImageValue | NoteImageValue[] {
    if (this.isValidImageValue(value)) {
      return true
    }

    if (!isMultiImageColumn(column) || !Array.isArray(value)) {
      return false
    }

    return (
      value.length > 0 && value.every((item) => this.isValidImageValue(item))
    )
  }

  private isValidImageValue(value: unknown): value is NoteImageValue {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }

    const imageValue = value as NoteImageValue
    const hasImageSource =
      typeof imageValue.dataUrl === 'string' ||
      typeof imageValue.path === 'string' ||
      typeof imageValue.url === 'string'
    const hasValidSize =
      imageValue.size === undefined ||
      (Number.isInteger(imageValue.size) && imageValue.size >= 0)
    const hasValidWidth =
      imageValue.width === undefined ||
      (Number.isInteger(imageValue.width) && imageValue.width >= 0)
    const hasValidHeight =
      imageValue.height === undefined ||
      (Number.isInteger(imageValue.height) && imageValue.height >= 0)

    return hasImageSource && hasValidSize && hasValidWidth && hasValidHeight
  }

  private isSystemTimestampColumn(column: NoteColumn): boolean {
    return (
      column.isDefault &&
      (column.name === 'createdAt' || column.name === 'updatedAt')
    )
  }

  private createTimestamp(): string {
    return new Date().toISOString()
  }
}
