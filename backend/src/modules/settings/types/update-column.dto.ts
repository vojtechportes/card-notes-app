import { ApiPropertyOptional } from '@nestjs/swagger';
import { ColumnTypeEnum } from './column-type-enum';

export class UpdateColumnDto {
  @ApiPropertyOptional({ description: 'Unique machine-readable column name.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Human-readable column title.' })
  title?: string;

  @ApiPropertyOptional({ enum: ColumnTypeEnum, description: 'Column value type.' })
  type?: ColumnTypeEnum;

  @ApiPropertyOptional({ description: 'Column display order.' })
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the column should be hidden.' })
  isHidden?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true, description: 'Column-specific configuration.' })
  config?: Record<string, unknown> | null;
}
