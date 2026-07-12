import { ApiProperty } from '@nestjs/swagger'

export class UpdateNoteTypeDto {
  @ApiProperty({ type: String, description: 'Updated note type title.' })
  title: string
}
