import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ImportLabelIssueCodeEnum } from './import-label-issue-code-enum'

export class ImportLabelIssueDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Imported label id when available.',
  })
  labelId: string | null

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Imported label name when available.',
  })
  name: string | null

  @ApiProperty({
    enum: ImportLabelIssueCodeEnum,
    description: 'Stable reason why imported label data was skipped.',
  })
  code: ImportLabelIssueCodeEnum
}
