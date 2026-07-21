import { ApiProperty } from '@nestjs/swagger'

export class DeleteLabelResultDto {
  @ApiProperty({ type: String, description: 'Deleted label id.' })
  deletedLabelId: string

  @ApiProperty({
    type: Number,
    description: 'Number of note values changed while removing the label id.',
  })
  affectedNoteValuesCount: number
}
