import { ApiProperty } from '@nestjs/swagger'

export class DeleteAllNotesResultDto {
  @ApiProperty({
    type: Number,
    description: 'Number of notes deleted by the destructive operation.',
  })
  deletedCount: number
}
