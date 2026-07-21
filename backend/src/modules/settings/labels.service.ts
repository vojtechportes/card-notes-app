import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { LabelsRepository } from './labels.repository'
import { NoteTypesRepository } from './note-types.repository'
import type { CreateLabelInput } from './types/create-label-input'
import type { DeleteLabelResult } from './types/delete-label-result'
import type { Label } from './types/label'
import type { UpdateLabelInput } from './types/update-label-input'

const labelColorPattern = /^#[0-9A-Fa-f]{6}$/

@Injectable()
export class LabelsService {
  constructor(
    @Inject(LabelsRepository)
    private readonly labelsRepository: LabelsRepository,
    @Inject(NoteTypesRepository)
    private readonly noteTypesRepository: NoteTypesRepository
  ) {}

  listLabels(): Label[] {
    return this.labelsRepository.findAll()
  }

  getLabel(id: string): Label {
    const label = this.labelsRepository.findById(id)

    if (!label) {
      throw new NotFoundException('Label was not found.')
    }

    return label
  }

  createLabel(input: CreateLabelInput): Label {
    const title = this.normalizeRequiredString(input.title, 'Label title')
    const name = this.normalizeRequiredString(input.name, 'Label name')
    const color = this.normalizeColor(input.color)
    const noteTypeId = input.noteTypeId ?? null

    this.ensureSourceExists(noteTypeId)
    this.ensureNameIsAvailable(name, noteTypeId)

    try {
      return this.labelsRepository.create({ title, name, color, noteTypeId })
    } catch (error) {
      this.throwConflictForUniqueConstraint(error)
      throw error
    }
  }

  updateLabel(id: string, input: UpdateLabelInput): Label {
    const existingLabel = this.getLabel(id)

    if (
      input.title === undefined &&
      input.name === undefined &&
      input.color === undefined &&
      input.noteTypeId === undefined
    ) {
      throw new BadRequestException(
        'Label update must include at least one field.'
      )
    }

    const title =
      input.title === undefined
        ? existingLabel.title
        : this.normalizeRequiredString(input.title, 'Label title')
    const name =
      input.name === undefined
        ? existingLabel.name
        : this.normalizeRequiredString(input.name, 'Label name')
    const color =
      input.color === undefined
        ? existingLabel.color
        : this.normalizeColor(input.color)
    const noteTypeId =
      input.noteTypeId === undefined
        ? existingLabel.noteTypeId
        : input.noteTypeId

    this.ensureSourceExists(noteTypeId)
    this.ensureNameIsAvailable(name, noteTypeId, id)

    try {
      return this.labelsRepository.update(id, {
        title,
        name,
        color,
        noteTypeId,
      }) as Label
    } catch (error) {
      this.throwConflictForUniqueConstraint(error)
      throw error
    }
  }

  deleteLabel(id: string): DeleteLabelResult {
    this.getLabel(id)

    const result = this.labelsRepository.deleteWithValueCleanupAndCount(id)

    if (!result.deleted) {
      throw new NotFoundException('Label was not found.')
    }

    return {
      deletedLabelId: id,
      affectedNoteValuesCount: result.affectedNoteValuesCount,
    }
  }

  private normalizeRequiredString(value: string, label: string): string {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      throw new BadRequestException(`${label} is required.`)
    }

    return normalizedValue
  }

  private normalizeColor(color: string): string {
    const normalizedColor = color.trim()

    if (!labelColorPattern.test(normalizedColor)) {
      throw new BadRequestException(
        'Label color must use the #RRGGBB hexadecimal format.'
      )
    }

    return normalizedColor.toUpperCase()
  }

  private ensureSourceExists(noteTypeId: string | null): void {
    if (noteTypeId !== null && !this.noteTypesRepository.findById(noteTypeId)) {
      throw new BadRequestException('Label note type source does not exist.')
    }
  }

  private ensureNameIsAvailable(
    name: string,
    noteTypeId: string | null,
    currentLabelId?: string
  ): void {
    const existingLabel = this.labelsRepository.findBySourceAndName(
      noteTypeId,
      name
    )

    if (existingLabel && existingLabel.id !== currentLabelId) {
      throw new ConflictException(
        'Label name must be unique within its source.'
      )
    }
  }

  private throwConflictForUniqueConstraint(error: unknown): void {
    if (
      error instanceof Error &&
      'code' in error &&
      String((error as Error & { code?: unknown }).code).startsWith(
        'SQLITE_CONSTRAINT'
      )
    ) {
      throw new ConflictException(
        'Label name must be unique within its source.'
      )
    }
  }
}
