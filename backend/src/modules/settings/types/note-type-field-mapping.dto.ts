import { ApiProperty } from '@nestjs/swagger'

export class NoteTypeFieldMappingDto {
  @ApiProperty({ type: String, description: 'Source note type column id.' })
  sourceColumnId: string

  @ApiProperty({ type: String, description: 'Target note type column id.' })
  targetColumnId: string
}
