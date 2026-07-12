import { ApiProperty } from '@nestjs/swagger'

export class NoteTypeDto {
  @ApiProperty({ type: String, description: 'Stable note type id.' })
  id: string

  @ApiProperty({ type: String, description: 'Human-readable note type title.' })
  title: string

  @ApiProperty({ type: String, description: 'Timestamp when the note type was created.' })
  createdAt: string

  @ApiProperty({ type: String, description: 'Timestamp when the note type was last updated.' })
  updatedAt: string
}
