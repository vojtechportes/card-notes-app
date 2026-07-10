import { ApiPropertyOptional } from '@nestjs/swagger'
import { ColumnDeleteModeEnum } from './column-delete-mode-enum'

export class DeleteColumnQueryDto {
  @ApiPropertyOptional({
    enum: ColumnDeleteModeEnum,
    description: 'Whether associated note values should be deleted too.',
  })
  deleteMode?: ColumnDeleteModeEnum
}
