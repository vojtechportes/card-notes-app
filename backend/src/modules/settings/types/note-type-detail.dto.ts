import { ApiProperty } from '@nestjs/swagger'
import { ColumnDto } from './column.dto'
import { NoteTypeDto } from './note-type.dto'

export class NoteTypeDetailDto extends NoteTypeDto {
  @ApiProperty({
    type: ColumnDto,
    isArray: true,
    description: 'Columns configured for the note type.',
  })
  columns: ColumnDto[]
}
