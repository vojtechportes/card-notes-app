import { ApiProperty } from '@nestjs/swagger'
import { LabelsColumnSourcesDto } from './labels-column-sources.dto'

export class LabelsColumnConfigDto {
  @ApiProperty({
    type: Boolean,
    description: 'Whether more than one label may be assigned.',
  })
  allowMultiple: boolean

  @ApiProperty({
    type: LabelsColumnSourcesDto,
    nullable: true,
    description: 'Allowed sources, or null to allow every label source.',
  })
  sources: LabelsColumnSourcesDto | null
}
