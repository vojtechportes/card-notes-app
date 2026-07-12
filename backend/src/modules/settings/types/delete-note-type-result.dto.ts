import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class DeleteNoteTypeResultDto {
  @ApiProperty({ type: String, description: 'Deleted note type id.' })
  deletedNoteTypeId: string

  @ApiProperty({
    type: Number,
    description: 'Number of notes deleted as part of the operation.',
  })
  deletedNotesCount: number

  @ApiProperty({
    type: Number,
    description: 'Number of notes moved to another note type.',
  })
  movedNotesCount: number

  @ApiPropertyOptional({
    type: String,
    description: 'Target note type id used for moved notes, when applicable.',
  })
  targetNoteTypeId?: string
}
