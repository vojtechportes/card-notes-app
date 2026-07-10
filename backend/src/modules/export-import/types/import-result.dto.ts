import { ApiProperty } from '@nestjs/swagger'

export class ImportResultDto {
  @ApiProperty({
    type: Number,
    description:
      'Number of column definitions processed from the import payload.',
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
}
