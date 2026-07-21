import { ApiProperty } from '@nestjs/swagger'
import { ImportLabelIssueDto } from './import-label-issue.dto'
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
    description: 'Number of new labels created from the import payload.',
  })
  importedLabels: number

  @ApiProperty({
    type: Number,
    description: 'Number of existing labels reused by source and name.',
  })
  reusedLabels: number

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
    type: () => ImportLabelIssueDto,
    isArray: true,
    description: 'Label definitions or assignments skipped during import.',
  })
  labelIssues: ImportLabelIssueDto[]

  @ApiProperty({
    type: () => ImportUnmatchedFieldDto,
    isArray: true,
    description: 'Imported fields that could not be matched to a target field.',
  })
  unmatchedFields: ImportUnmatchedFieldDto[]
}
