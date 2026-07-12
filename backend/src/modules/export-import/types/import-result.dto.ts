import { ApiProperty } from '@nestjs/swagger'
import { ImportUnmatchedFieldDto } from './import-unmatched-field.dto'

export class ImportResultDto {
  @ApiProperty({
    type: Number,
    description:
      'Number of imported fields that were matched or created successfully.',
  })
  importedColumns: number

  @ApiProperty({
    type: Number,
    description: 'Number of notes appended from the import payload.',
  })
  importedNotes: number

  @ApiProperty({
    type: Boolean,
    description: 'Whether imported general settings were applied.',
  })
  updatedGeneralSettings: boolean

  @ApiProperty({
    type: () => ImportUnmatchedFieldDto,
    isArray: true,
    description: 'Imported fields that could not be matched to a target field.',
  })
  unmatchedFields: ImportUnmatchedFieldDto[]
}
