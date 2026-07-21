import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger'
import { ColumnTypeEnum } from './column-type-enum'
import { LabelsColumnConfigDto } from './labels-column-config.dto'

export class ColumnDto {
  @ApiProperty({ type: String, description: 'Stable column id.' })
  id: string

  @ApiProperty({ type: String, description: 'Owning note type id.' })
  noteTypeId: string

  @ApiProperty({
    type: String,
    description: 'Unique machine-readable column name within a note type.',
  })
  name: string

  @ApiProperty({ type: String, description: 'Human-readable column title.' })
  title: string

  @ApiProperty({ enum: ColumnTypeEnum, description: 'Column value type.' })
  type: ColumnTypeEnum

  @ApiProperty({ type: Number, description: 'Column display order.' })
  sortOrder: number

  @ApiProperty({
    type: Boolean,
    description:
      'Whether the column should be hidden in note entry/display surfaces.',
  })
  isHidden: boolean

  @ApiProperty({
    type: Boolean,
    description: 'Whether the column is a non-removable system default.',
  })
  isDefault: boolean

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(LabelsColumnConfigDto) },
      { type: 'object', additionalProperties: true },
    ],
    nullable: true,
    description: 'Column-specific configuration.',
  })
  config: Record<string, unknown> | null

  @ApiProperty({
    type: String,
    description: 'Timestamp when the column was created.',
  })
  createdAt: string

  @ApiProperty({
    type: String,
    description: 'Timestamp when the column was last updated.',
  })
  updatedAt: string
}
