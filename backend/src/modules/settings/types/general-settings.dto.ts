import { ApiProperty } from '@nestjs/swagger'

export class GeneralSettingsDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Optional number of text characters to display before truncation.',
  })
  textTruncationLength: number | null

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Optional number of configured fields to display on note cards.',
  })
  cardFieldDisplayCount: number | null

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description:
      'Optional flag to determine if date and time fields should be merged on note cards.',
  })
  mergeDateTimeFields: boolean | null
}
