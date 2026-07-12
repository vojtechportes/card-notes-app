import { ApiProperty } from '@nestjs/swagger'

export class CreateNoteTypeDto {
  @ApiProperty({ type: String, description: 'Human-readable note type title.' })
  title: string
}
