import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ColumnTypeEnum } from '../../settings/types/column-type-enum'

export class ImportUnmatchedFieldDto {
  @ApiProperty({ type: String, description: 'Imported field name.' })
  name: string

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Imported field title when available.',
  })
  title: string | null

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Imported note type title when available.',
  })
  noteTypeTitle: string | null

  @ApiPropertyOptional({
    enum: ColumnTypeEnum,
    nullable: true,
    description: 'Imported field type when available.',
  })
  type: ColumnTypeEnum | null
}
