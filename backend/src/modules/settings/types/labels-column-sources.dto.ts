import { ApiProperty } from '@nestjs/swagger'

export class LabelsColumnSourcesDto {
  @ApiProperty({
    type: Boolean,
    description: 'Whether shared labels are allowed.',
  })
  includeShared: boolean

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Allowed note-template label source ids.',
  })
  noteTypeIds: string[]
}
