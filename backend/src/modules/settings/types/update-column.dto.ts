import { ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger'
import { ColumnTypeEnum } from './column-type-enum'
import { LabelsColumnConfigDto } from './labels-column-config.dto'

export class UpdateColumnDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Unique machine-readable column name.',
  })
  name?: string

  @ApiPropertyOptional({
    type: String,
    description: 'Human-readable column title.',
  })
  title?: string

  @ApiPropertyOptional({
    enum: ColumnTypeEnum,
    description: 'Column value type.',
  })
  type?: ColumnTypeEnum

  @ApiPropertyOptional({ type: Number, description: 'Column display order.' })
  sortOrder?: number

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the column should be hidden.',
  })
  isHidden?: boolean

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(LabelsColumnConfigDto) },
      { type: 'object', additionalProperties: true },
    ],
    nullable: true,
    description: 'Column-specific configuration.',
  })
  config?: Record<string, unknown> | null
}
