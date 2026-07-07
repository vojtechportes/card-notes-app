import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ColumnTypeEnum } from './column-type-enum';

export class ColumnDto {
  @ApiProperty({ description: 'Stable column id.' })
  id: string;

  @ApiProperty({ description: 'Unique machine-readable column name.' })
  name: string;

  @ApiProperty({ description: 'Human-readable column title.' })
  title: string;

  @ApiProperty({ enum: ColumnTypeEnum, description: 'Column value type.' })
  type: ColumnTypeEnum;

  @ApiProperty({ description: 'Column display order.' })
  sortOrder: number;

  @ApiProperty({ description: 'Whether the column should be hidden in note entry/display surfaces.' })
  isHidden: boolean;

  @ApiProperty({ description: 'Whether the column is a non-removable system default.' })
  isDefault: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true, description: 'Column-specific configuration.' })
  config: Record<string, unknown> | null;

  @ApiProperty({ description: 'Timestamp when the column was created.' })
  createdAt: string;

  @ApiProperty({ description: 'Timestamp when the column was last updated.' })
  updatedAt: string;
}
