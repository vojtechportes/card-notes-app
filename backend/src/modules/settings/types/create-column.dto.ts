import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ColumnTypeEnum } from './column-type-enum'

export class CreateColumnDto {
  @ApiProperty({
    type: String,
    description: 'Unique machine-readable column name.',
  })
  name: string

  @ApiProperty({ type: String, description: 'Human-readable column title.' })
  title: string

  @ApiProperty({ enum: ColumnTypeEnum, description: 'Column value type.' })
  type: ColumnTypeEnum

  @ApiPropertyOptional({
    type: Number,
    description: 'Column display order. Defaults to the next available order.',
  })
  sortOrder?: number

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the column should be hidden.',
  })
  isHidden?: boolean

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Column-specific configuration.',
  })
  config?: Record<string, unknown> | null
}
