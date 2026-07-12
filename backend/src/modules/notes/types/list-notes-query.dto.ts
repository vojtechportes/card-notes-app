import { ApiPropertyOptional } from '@nestjs/swagger'
import { NoteSortDirectionEnum } from './note-sort-direction-enum'
import { NoteSortFieldEnum } from './note-sort-field-enum'

export class ListNotesQueryDto {
  @ApiPropertyOptional({
    enum: NoteSortFieldEnum,
    default: NoteSortFieldEnum.CreatedAt,
    description: 'Note timestamp field used for sorting.',
  })
  sortBy?: NoteSortFieldEnum

  @ApiPropertyOptional({
    enum: NoteSortDirectionEnum,
    default: NoteSortDirectionEnum.Desc,
    description: 'Sort direction for notes.',
  })
  sortDirection?: NoteSortDirectionEnum

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    description:
      'Optional note type ids to filter by. Supports repeated query values or comma-separated ids.',
  })
  noteTypeIds?: string[] | string
}
