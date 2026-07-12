import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CreateTargetNoteTypeDto } from './create-target-note-type.dto'
import { DeleteNoteTypeModeEnum } from './delete-note-type-mode-enum'
import { NoteTypeFieldMappingDto } from './note-type-field-mapping.dto'

export class DeleteNoteTypeDto {
  @ApiProperty({
    enum: DeleteNoteTypeModeEnum,
    description: 'How to handle notes that belong to the deleted note type.',
  })
  mode: DeleteNoteTypeModeEnum

  @ApiPropertyOptional({
    type: String,
    description: 'Existing note type id that moved notes should be reassigned to.',
  })
  targetNoteTypeId?: string

  @ApiPropertyOptional({
    type: CreateTargetNoteTypeDto,
    description: 'Replacement note type to create before moving notes.',
  })
  createTargetNoteType?: CreateTargetNoteTypeDto

  @ApiPropertyOptional({
    type: NoteTypeFieldMappingDto,
    isArray: true,
    description: 'Explicit source-to-target field mappings used during note migration.',
  })
  fieldMappings?: NoteTypeFieldMappingDto[]
}
