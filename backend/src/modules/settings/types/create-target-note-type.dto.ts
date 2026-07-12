import { ApiProperty } from '@nestjs/swagger'

export class CreateTargetNoteTypeDto {
  @ApiProperty({
    type: String,
    description: 'Title for a newly created replacement note type.',
  })
  title: string
}
